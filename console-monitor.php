<?php
/**
 * Plugin Name: Console Monitor Pro
 * Plugin URI: https://github.com/tu-usuario/console-monitor-pro
 * Description: Terminal de debugging, visor móvil flotante y sistema de notas con marcadores
 * Version: 3.0
 * Author: Tu Nombre
 * License: GPL v2 or later
 * Text Domain: console-monitor-pro
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes del plugin
define('CONSOLE_MONITOR_VERSION', '3.0');
define('CONSOLE_MONITOR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CONSOLE_MONITOR_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CONSOLE_MONITOR_ASSETS_URL', CONSOLE_MONITOR_PLUGIN_URL . 'assets/');

/**
 * Clase principal del plugin - VERSIÓN CORREGIDA CON VALIDACIÓN MEJORADA
 */
class ConsoleMonitorPro {
    
    private static $instance = null;
    private $log_buffer = array();
    private $max_logs = 100;
    private $notes_table;
    private $simple_notes_table;
    
    /**
     * Singleton pattern
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        global $wpdb;
        $this->notes_table = $wpdb->prefix . 'console_monitor_notes';
        $this->simple_notes_table = $wpdb->prefix . 'cm_simple_notes';
        $this->init();
    }
    
    /**
     * Validación de permisos mejorada - FIX PRINCIPAL
     */
    private function validate_ajax_request() {
        // Log de debugging
        error_log('Console Monitor: Validating AJAX request');
        error_log('Console Monitor: User ID = ' . get_current_user_id());
        error_log('Console Monitor: User can manage options = ' . (current_user_can('manage_options') ? 'YES' : 'NO'));
        error_log('Console Monitor: Nonce provided = ' . (isset($_POST['nonce']) ? 'YES' : 'NO'));
        
        // 1. Verificar que el usuario está logueado
        if (!is_user_logged_in()) {
            error_log('Console Monitor: User not logged in');
            wp_send_json_error('Usuario no autenticado');
            return false;
        }
        
        // 2. Verificar permisos básicos (más flexible)
        if (!current_user_can('manage_options') && 
            !current_user_can('edit_posts') && 
            !current_user_can('administrator')) {
            error_log('Console Monitor: User lacks required capabilities');
            wp_send_json_error('Permisos insuficientes');
            return false;
        }
        
        // 3. Verificar nonce - con fallback
        if (isset($_POST['nonce'])) {
            if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
                error_log('Console Monitor: Nonce verification failed');
                error_log('Console Monitor: Provided nonce = ' . $_POST['nonce']);
                
                // Fallback: verificar con nonce alternativo
                if (!wp_verify_nonce($_POST['nonce'], 'console-monitor-nonce') &&
                    !wp_verify_nonce($_POST['nonce'], 'cm_nonce')) {
                    wp_send_json_error('Token de seguridad inválido');
                    return false;
                }
            }
        } else {
            error_log('Console Monitor: No nonce provided');
            // En modo desarrollo, permitir sin nonce
            if (!defined('WP_DEBUG') || !WP_DEBUG) {
                wp_send_json_error('Token de seguridad requerido');
                return false;
            }
        }
        
        error_log('Console Monitor: AJAX request validation passed');
        return true;
    }
    
    /**
     * Inicializar el plugin completo
     */
    private function init() {
        // Solo para usuarios con permisos
        if (!current_user_can('edit_posts')) {
            return;
        }
        
        // Crear tablas al inicializar
        add_action('init', array($this, 'maybe_create_notes_table'));
        add_action('init', array($this, 'maybe_create_simple_notes_table'));
        
        // Hooks básicos
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('wp_head', array($this, 'inject_console_interceptor'), 1);
        add_action('admin_head', array($this, 'inject_console_interceptor'), 1);
        add_action('wp_footer', array($this, 'render_floating_interface'));
        add_action('admin_footer', array($this, 'render_floating_interface'));
        
        // AJAX handlers - TERMINAL
        add_action('wp_ajax_cm_get_logs', array($this, 'ajax_get_logs'));
        add_action('wp_ajax_cm_clear_logs', array($this, 'ajax_clear_logs'));
        
        // AJAX handlers - NOTAS AVANZADAS CON MARCADORES
        add_action('wp_ajax_cm_get_notes', array($this, 'ajax_get_notes'));
        add_action('wp_ajax_cm_save_note', array($this, 'ajax_save_note'));
        add_action('wp_ajax_cm_delete_note', array($this, 'ajax_delete_note'));
        add_action('wp_ajax_cm_update_note', array($this, 'ajax_update_note'));
        add_action('wp_ajax_cm_toggle_checklist_item', array($this, 'ajax_toggle_checklist_item'));
        
        // AJAX handlers - MARCADORES VISUALES
        add_action('wp_ajax_cm_get_page_markers', array($this, 'ajax_get_page_markers'));
        add_action('wp_ajax_cm_save_marker', array($this, 'ajax_save_marker'));
        add_action('wp_ajax_cm_remove_marker', array($this, 'ajax_remove_marker'));
        
        // AJAX handlers - NOTAS BÁSICAS CON MARCADORES
        add_action('wp_ajax_cm_get_simple_notes', array($this, 'ajax_get_simple_notes'));
        add_action('wp_ajax_cm_save_simple_note', array($this, 'ajax_save_simple_note'));
        add_action('wp_ajax_cm_delete_simple_note', array($this, 'ajax_delete_simple_note'));
        
        // Error handler PHP
        $this->setup_error_handling();
        
        // Hook de activación
        register_activation_hook(__FILE__, array($this, 'plugin_activation'));
        
        // Debug info
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('Console Monitor Pro: Plugin initialized for user with edit_posts capability');
        }
    }
    
    /**
     * Verificar y crear tabla si no existe - CON MARCADORES
     */
    public function maybe_create_notes_table() {
        global $wpdb;
        
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$this->notes_table}'") === $this->notes_table;
        
        if (!$table_exists) {
            $this->create_notes_table();
            error_log('Console Monitor: Notes table created on init');
        } else {
            // Verificar si las columnas de marcadores existen
            $columns = $wpdb->get_results("SHOW COLUMNS FROM {$this->notes_table}");
            $has_marker_x = false;
            $has_marker_y = false;
            $has_page_url = false;
            
            foreach ($columns as $column) {
                if ($column->Field === 'marker_x') $has_marker_x = true;
                if ($column->Field === 'marker_y') $has_marker_y = true;
                if ($column->Field === 'page_url') $has_page_url = true;
            }
            
            // Agregar columnas de marcadores si no existen
            if (!$has_marker_x) {
                $wpdb->query("ALTER TABLE {$this->notes_table} ADD COLUMN marker_x int(11) DEFAULT NULL");
            }
            if (!$has_marker_y) {
                $wpdb->query("ALTER TABLE {$this->notes_table} ADD COLUMN marker_y int(11) DEFAULT NULL");
            }
            if (!$has_page_url) {
                $wpdb->query("ALTER TABLE {$this->notes_table} ADD COLUMN page_url varchar(500) DEFAULT NULL");
            }
        }
    }
    
    /**
     * Verificar y crear tabla de notas básicas - CON MARCADORES
     */
    public function maybe_create_simple_notes_table() {
        global $wpdb;
        
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$this->simple_notes_table}'") === $this->simple_notes_table;
        
        if (!$table_exists) {
            $this->create_simple_notes_table();
            error_log('Console Monitor: Simple notes table created on init');
        } else {
            // Verificar si las columnas de marcadores existen
            $columns = $wpdb->get_results("SHOW COLUMNS FROM {$this->simple_notes_table}");
            $has_marker_x = false;
            $has_marker_y = false;
            $has_page_url = false;
            
            foreach ($columns as $column) {
                if ($column->Field === 'marker_x') $has_marker_x = true;
                if ($column->Field === 'marker_y') $has_marker_y = true;
                if ($column->Field === 'page_url') $has_page_url = true;
            }
            
            // Agregar columnas de marcadores si no existen
            if (!$has_marker_x) {
                $wpdb->query("ALTER TABLE {$this->simple_notes_table} ADD COLUMN marker_x int(11) DEFAULT NULL");
            }
            if (!$has_marker_y) {
                $wpdb->query("ALTER TABLE {$this->simple_notes_table} ADD COLUMN marker_y int(11) DEFAULT NULL");
            }
            if (!$has_page_url) {
                $wpdb->query("ALTER TABLE {$this->simple_notes_table} ADD COLUMN page_url varchar(500) DEFAULT NULL");
            }
        }
    }
    
    /**
     * Activación del plugin
     */
    public function plugin_activation() {
        $this->create_notes_table();
        $this->create_simple_notes_table();
        error_log('Console Monitor: Plugin activated and tables created with markers support');
    }
    
    /**
     * Enqueue assets modulares - CON DEBUGGING MEJORADO
     */
    public function enqueue_assets() {
        if (!current_user_can('edit_posts')) {
            return;
        }
        
        // CORE - Base del sistema
        wp_enqueue_style(
            'cm-core',
            CONSOLE_MONITOR_ASSETS_URL . 'css/cm-core.css',
            array(),
            CONSOLE_MONITOR_VERSION
        );
        
        wp_enqueue_script('jquery');
        wp_enqueue_script(
            'cm-core',
            CONSOLE_MONITOR_ASSETS_URL . 'js/cm-core.js',
            array('jquery'),
            CONSOLE_MONITOR_VERSION,
            true
        );
        
        // Terminal
        wp_enqueue_style(
            'cm-terminal',
            CONSOLE_MONITOR_ASSETS_URL . 'css/cm-terminal.css',
            array('cm-core'),
            CONSOLE_MONITOR_VERSION
        );
        
        wp_enqueue_script(
            'cm-terminal',
            CONSOLE_MONITOR_ASSETS_URL . 'js/cm-terminal.js',
            array('cm-core'),
            CONSOLE_MONITOR_VERSION,
            true
        );
        
        // iPhone/Tablet
        wp_enqueue_style(
            'cm-iphone',
            CONSOLE_MONITOR_ASSETS_URL . 'css/cm-iphone.css',
            array('cm-core'),
            CONSOLE_MONITOR_VERSION
        );
        
        wp_enqueue_script(
            'cm-iphone',
            CONSOLE_MONITOR_ASSETS_URL . 'js/cm-iphone.js',
            array('cm-core'),
            CONSOLE_MONITOR_VERSION,
            true
        );
        
        // Notas CON MARCADORES
        wp_enqueue_style(
            'cm-notes',
            CONSOLE_MONITOR_ASSETS_URL . 'css/cm-notes.css',
            array('cm-core'),
            CONSOLE_MONITOR_VERSION
        );
        
        wp_enqueue_script(
            'cm-notes',
            CONSOLE_MONITOR_ASSETS_URL . 'js/cm-notes.js',
            array('cm-core'),
            CONSOLE_MONITOR_VERSION,
            true
        );
        
        // Localizar datos para todos los módulos - CON DEBUGGING MEJORADO
        $current_user = wp_get_current_user();
        wp_localize_script('cm-core', 'cmData', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('console_monitor_nonce'),
            'current_url' => $this->get_current_url(),
            'debug' => defined('WP_DEBUG') && WP_DEBUG,
            'user_can_manage' => current_user_can('manage_options'),
            'user_can_edit' => current_user_can('edit_posts'),
            'user_id' => get_current_user_id(),
            'user_login' => $current_user->user_login,
            'is_admin' => is_admin(),
            'plugin_version' => CONSOLE_MONITOR_VERSION
        ));
        
        // Debug JavaScript inline - MEJORADO
        if (defined('WP_DEBUG') && WP_DEBUG) {
            wp_add_inline_script('cm-core', '
                console.log("Console Monitor: Assets loaded with markers support");
                console.log("cmData:", typeof cmData !== "undefined" ? cmData : "NOT DEFINED");
                console.log("jQuery version:", jQuery.fn.jquery);
                console.log("User ID:", ' . get_current_user_id() . ');
                console.log("User can manage options:", ' . (current_user_can('manage_options') ? 'true' : 'false') . ');
                console.log("User can edit posts:", ' . (current_user_can('edit_posts') ? 'true' : 'false') . ');
                console.log("Is admin:", ' . (is_admin() ? 'true' : 'false') . ');
                console.log("Nonce:", "' . wp_create_nonce('console_monitor_nonce') . '");
            ');
        }
    }
    
    /**
     * Obtener URL actual correctamente
     */
    private function get_current_url() {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        $url = $protocol . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
        return $url;
    }
    
    /**
     * Inyectar interceptor de console
     */
    public function inject_console_interceptor() {
        if (!current_user_can('edit_posts')) {
            return;
        }
        ?>
        <script type="text/javascript">
        // Console Monitor - Interceptor Global
        window.CMPro = window.CMPro || {};
        window.CMPro.logs = [];
        
        (function() {
            // Guardar originales
            const original = {
                log: console.log,
                error: console.error,
                warn: console.warn,
                info: console.info
            };
            
            // Sistema de debouncing
            const logBuffer = new Map();
            const DEBOUNCE_TIME = 50;
            let debounceTimer = null;
            
            function capture(type, args) {
                const message = Array.from(args).map(arg => {
                    if (typeof arg === 'object') {
                        try { return JSON.stringify(arg, null, 2); }
                        catch(e) { return '[Object]'; }
                    }
                    return String(arg);
                }).join(' ');
                
                const logKey = `${type}:${message}`;
                const now = Date.now();
                
                if (logBuffer.has(logKey)) {
                    const existing = logBuffer.get(logKey);
                    if (now - existing.lastTime < DEBOUNCE_TIME) {
                        existing.count++;
                        existing.lastTime = now;
                        return;
                    }
                }
                
                const entry = {
                    type: type,
                    message: message,
                    time: new Date().toLocaleTimeString(),
                    source: '',
                    count: 1,
                    lastTime: now
                };
                
                // Stack trace simple
                try {
                    const stack = new Error().stack;
                    if (stack) {
                        const lines = stack.split('\n');
                        for (let i = 3; i < lines.length; i++) {
                            if (lines[i] && !lines[i].includes('console-monitor')) {
                                const match = lines[i].match(/(?:at\s+)?(?:.*?\s+)?\(?(.+?):(\d+)/);
                                if (match) {
                                    entry.source = match[1].split('/').pop() + ':' + match[2];
                                    break;
                                }
                            }
                        }
                    }
                } catch(e) {}
                
                logBuffer.set(logKey, entry);
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(flushLogBuffer, DEBOUNCE_TIME);
            }
            
            function flushLogBuffer() {
                logBuffer.forEach((entry, key) => {
                    if (entry.count > 1) {
                        entry.message += ` (×${entry.count})`;
                    }
                    
                    window.CMPro.logs.push({
                        type: entry.type,
                        message: entry.message,
                        time: entry.time,
                        source: entry.source
                    });
                });
                
                logBuffer.clear();
                
                if (window.CMPro.logs.length > 100) {
                    window.CMPro.logs = window.CMPro.logs.slice(-80);
                }
            }
            
            // Interceptar métodos
            console.log = function() {
                original.log.apply(console, arguments);
                capture('log', arguments);
            };
            
            console.error = function() {
                original.error.apply(console, arguments);
                capture('error', arguments);
            };
            
            console.warn = function() {
                original.warn.apply(console, arguments);
                capture('warn', arguments);
            };
            
            console.info = function() {
                original.info.apply(console, arguments);
                capture('info', arguments);
            };
            
            // Errores globales
            window.addEventListener('error', function(e) {
                const entry = {
                    type: 'error',
                    message: e.message,
                    time: new Date().toLocaleTimeString(),
                    source: e.filename ? e.filename.split('/').pop() + ':' + e.lineno : ''
                };
                window.CMPro.logs.push(entry);
            });
            
            // Debug inicial
            console.log('Console Monitor: Interceptor initialized with markers support - USER ID: <?php echo get_current_user_id(); ?>');
        })();
        </script>
        <?php
    }
    
    /**
     * Setup error handling PHP
     */
    public function setup_error_handling() {
        set_error_handler(array($this, 'php_error_handler'), 
            E_WARNING | E_NOTICE | E_USER_WARNING | E_USER_NOTICE
        );
    }
    
    /**
     * PHP Error handler
     */
    public function php_error_handler($severity, $message, $file, $line) {
        if (!(error_reporting() & $severity) || strpos($file, 'console-monitor') !== false) {
            return false;
        }
        
        $types = array(
            E_WARNING => 'PHP_WARNING',
            E_NOTICE => 'PHP_NOTICE',
            E_USER_WARNING => 'USER_WARNING',
            E_USER_NOTICE => 'USER_NOTICE'
        );
        
        $type = isset($types[$severity]) ? $types[$severity] : 'PHP_ERROR';
        
        $this->log_buffer[] = array(
            'type' => strtolower(str_replace('PHP_', '', $type)),
            'message' => $message,
            'time' => date('H:i:s'),
            'source' => basename($file) . ':' . $line
        );
        
        if (count($this->log_buffer) > $this->max_logs) {
            $this->log_buffer = array_slice($this->log_buffer, -80);
        }
        
        return false;
    }
    
    /**
     * Renderizar TODA la interfaz flotante CON MARCADORES VISUALES COMPLETOS
     */
    public function render_floating_interface() {
        if (!current_user_can('edit_posts')) {
            return;
        }
        ?>
        
        <!-- CONTENEDOR DE MARCADORES VISUALES - DEBE IR PRIMERO -->
        <div id="cm-markers-container" class="cm-markers-container"></div>
        
        <!-- SISTEMA ORIGINAL - Contenedor Flotante Principal -->
        <div class="cm-floating-container">
            <!-- Botón Principal -->
            <button id="cm-floating-btn" class="cm-floating-btn">
                <div class="cm-btn-content">
                    <span class="cm-btn-icon">🔧</span>
                    <span class="cm-btn-text">Debug</span>
                </div>
            </button>
            
            <!-- Botones Expandidos -->
            <div class="cm-expanded-buttons">
                <button class="cm-option-btn notes" title="Notas Avanzadas y Marcadores" data-panel="notes">
                    📝
                </button>
                <button class="cm-option-btn terminal" title="Terminal de Console" data-panel="terminal">
                    🐛
                </button>
                <button class="cm-option-btn iphone" title="Vista iPhone/Tablet" data-panel="iphone">
                    📱
                </button>
            </div>
        </div>
        
        <!-- SISTEMA ORIGINAL - Panel de Notas AVANZADAS CON MARCADORES -->
        <div id="cm-notes" class="cm-panel cm-notes">
            <div class="cm-panel-header">
                <div class="cm-panel-title">
                    <span class="cm-title-icon">📝</span>
                    <span>Notas con Marcadores</span>
                </div>
                <div class="cm-panel-controls">
                    <div class="cm-notes-header-actions">
                        <button class="cm-btn-add-note" title="Nueva Nota con Marcador">
                            <span>➕</span>
                            <span class="cm-btn-text">Nueva</span>
                        </button>
                        <button class="cm-btn-refresh-notes" title="Actualizar">
                            <span>🔄</span>
                        </button>
                        <button class="cm-btn-toggle-markers" title="Toggle Marcadores">
                            <span>👁️</span>
                        </button>
                    </div>
                    <button class="cm-btn-close" title="Cerrar">✕</button>
                </div>
            </div>
            <div class="cm-panel-body">
                <div class="cm-notes-container" id="cm-notes-container">
                    <!-- Las notas avanzadas se cargarán aquí -->
                </div>
            </div>
            <div class="cm-panel-footer">
                <span class="cm-notes-count">0 notas</span>
                <span style="font-size: 10px; opacity: 0.7;">Ctrl+Shift+N • Notas con checklist y marcadores</span>
            </div>
        </div>
        
        <!-- Modal para Nueva/Editar Nota Avanzada CON MARCADORES COMPLETOS -->
        <div id="cm-note-modal" class="cm-note-modal" style="display: none;">
            <div class="cm-note-modal-content">
                <div class="cm-note-modal-header">
                    <h3>📝 <span id="cm-note-modal-title">Nueva Nota con Marcador</span></h3>
                    <button class="cm-note-modal-close">✕</button>
                </div>
                <div class="cm-note-modal-body">
                    <form id="cm-note-form">
                        <!-- NUEVO: Sección de Marcador Visual -->
                        <div class="cm-form-group cm-marker-section">
                            <label>🎯 Marcador en la Página:</label>
                            
                            <!-- Instrucciones cuando no hay marcador -->
                            <div id="cm-marker-instruction" class="cm-marker-instruction" style="display: block;">
                                <div class="cm-marker-instruction-content">
                                    <span class="cm-marker-icon">🎯</span>
                                    <div class="cm-marker-instruction-text">
                                        <strong>Marca un punto en la página</strong><br>
                                        <small>Haz clic en cualquier elemento de la página para marcarlo</small>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Información cuando hay marcador seleccionado -->
                            <div id="cm-marker-selected" class="cm-marker-selected" style="display: none;">
                                <div class="cm-marker-selected-content">
                                    <span class="cm-marker-icon">✅</span>
                                    <div class="cm-marker-selected-info">
                                        <strong>Marcador establecido en:</strong><br>
                                        <span>Coordenadas: (<span id="cm-marker-coordinates">0, 0</span>)</span><br>
                                        <small id="cm-marker-element-info">Elemento seleccionado</small>
                                    </div>
                                    <button type="button" class="cm-btn-change-marker" title="Cambiar marcador">
                                        🎯 Cambiar
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Campos ocultos para coordenadas -->
                            <input type="hidden" id="cm-marker-x" name="marker_x" value="">
                            <input type="hidden" id="cm-marker-y" name="marker_y" value="">
                            <input type="hidden" id="cm-page-url" name="page_url" value="<?php echo esc_url($this->get_current_url()); ?>">
                        </div>
                        
                        <div class="cm-form-group">
                            <label for="cm-note-title">Título:</label>
                            <input type="text" id="cm-note-title" name="title" required placeholder="Título de la nota">
                        </div>
                        
                        <div class="cm-form-group">
                            <label for="cm-note-description">Descripción:</label>
                            <textarea id="cm-note-description" name="description" rows="4" placeholder="Descripción detallada..."></textarea>
                        </div>
                        
                        <div class="cm-form-group">
                            <label for="cm-note-url">URL relacionada:</label>
                            <input type="url" id="cm-note-url" name="url" placeholder="https://ejemplo.com">
                        </div>
                        
                        <div class="cm-form-group">
                            <label>Lista de tareas:</label>
                            <div id="cm-checklist-container">
                                <div class="cm-checklist-item">
                                    <input type="text" placeholder="Nueva tarea..." class="cm-checklist-input">
                                    <button type="button" class="cm-checklist-add">➕</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="cm-form-actions">
                            <button type="button" class="cm-btn-cancel">Cancelar</button>
                            <button type="submit" class="cm-btn-save">💾 Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- SISTEMA ORIGINAL - Panel Terminal -->
        <div id="cm-terminal" class="cm-panel cm-terminal">
            <div class="cm-panel-header">
                <div class="cm-panel-title">
                    <span class="cm-title-icon">🐛</span>
                    <span>Console Terminal</span>
                </div>
                <div class="cm-panel-controls">
                    <button class="cm-btn-clear" title="Limpiar">🗑️</button>
                    <button class="cm-btn-close" title="Cerrar">✕</button>
                </div>
            </div>
            <div class="cm-panel-body">
                <div class="cm-logs-container" id="cm-logs">
                    <!-- Los logs se cargarán aquí -->
                </div>
            </div>
            <div class="cm-panel-footer">
                <span class="cm-logs-count">0 logs</span>
                <span style="font-size: 10px; opacity: 0.7;">Ctrl+Shift+C</span>
            </div>
        </div>
        
        <!-- SISTEMA ORIGINAL - Panel iPhone -->
        <div id="cm-iphone" class="cm-panel cm-iphone">
            <div class="cm-panel-header">
                <div class="cm-panel-title">
                    <span class="cm-title-icon">📱</span>
                    <span>Mobile Viewer</span>
                </div>
                <div class="cm-panel-controls">
                    <select class="cm-device-selector" id="cm-device-selector">
                        <optgroup label="📱 iPhones">
                            <option value="iphone-15-pro-max">iPhone 15 Pro Max</option>
                            <option value="iphone-15-pro" selected>iPhone 15 Pro</option>
                            <option value="iphone-15">iPhone 15</option>
                            <option value="iphone-14-pro-max">iPhone 14 Pro Max</option>
                            <option value="iphone-14-pro">iPhone 14 Pro</option>
                            <option value="iphone-14">iPhone 14</option>
                            <option value="iphone-13-pro-max">iPhone 13 Pro Max</option>
                            <option value="iphone-13-pro">iPhone 13 Pro</option>
                            <option value="iphone-13">iPhone 13</option>
                            <option value="iphone-12-pro-max">iPhone 12 Pro Max</option>
                            <option value="iphone-12-pro">iPhone 12 Pro</option>
                            <option value="iphone-se">iPhone SE</option>
                        </optgroup>
                        <optgroup label="📲 iPads">
                            <option value="ipad-pro-12-9">iPad Pro 12.9"</option>
                            <option value="ipad-pro-11">iPad Pro 11"</option>
                            <option value="ipad-air">iPad Air</option>
                            <option value="ipad-10-9">iPad 10.9"</option>
                            <option value="ipad-mini">iPad Mini</option>
                            <option value="ipad-9-7">iPad 9.7"</option>
                        </optgroup>
                        <optgroup label="📋 Android Tablets">
                            <option value="galaxy-tab-s9-ultra">Galaxy Tab S9 Ultra</option>
                            <option value="galaxy-tab-s9-plus">Galaxy Tab S9+</option>
                            <option value="galaxy-tab-s9">Galaxy Tab S9</option>
                            <option value="galaxy-tab-a9-plus">Galaxy Tab A9+</option>
                            <option value="surface-pro-9">Surface Pro 9</option>
                            <option value="pixel-tablet">Pixel Tablet</option>
                        </optgroup>
                    </select>
                    <button class="cm-btn-rotate" title="Rotar">🔄</button>
                    <button class="cm-btn-close" title="Cerrar">✕</button>
                </div>
            </div>
            <div class="cm-panel-body">
                <div class="cm-iphone-frame" id="cm-iphone-frame">
                    <div class="cm-iphone-screen">
                        <iframe id="cm-iphone-iframe" 
                                src="<?php echo esc_url($this->get_current_url()); ?>"
                                frameborder="0">
                        </iframe>
                    </div>
                    <div class="cm-iphone-notch"></div>
                    <div class="cm-iphone-home-indicator"></div>
                </div>
            </div>
            <div class="cm-panel-footer">
                <span class="cm-device-info" id="cm-device-info">iPhone 15 Pro • 393×852</span>
                <span style="font-size: 10px; opacity: 0.7;">Ctrl+Shift+M</span>
            </div>
        </div>
        
        <!-- SISTEMA ORIGINAL - Overlay -->
        <div id="cm-overlay" class="cm-overlay"></div>
        
        <!-- NUEVO SISTEMA DE NOTAS BÁSICAS (RÁPIDAS) CON MARCADORES -->
        
        <!-- Botón flotante para notas básicas -->
        <button class="cm-simple-toggle-btn" title="Notas Rápidas con Marcadores">📝
            <span class="cm-simple-notes-count" style="display: none;">0</span>
        </button>
        
        <!-- Widget de notas básicas CON MARCADORES -->
        <div class="cm-simple-notes-widget" style="display: none;">
            <div class="cm-simple-notes-header">
                <div class="cm-simple-notes-title">📝 Notas Rápidas</div>
                <button class="cm-simple-btn-close">✕</button>
            </div>
            
            <!-- Sección de marcador para notas básicas -->
            <div class="cm-simple-marker-section">
                <!-- Instrucciones cuando no hay marcador en notas básicas -->
                <div class="cm-simple-marker-instruction" style="padding: 10px; background: rgba(39, 174, 96, 0.1); border-radius: 6px; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px; color: #27ae60; font-size: 11px;">
                        <span>🎯</span>
                        <div>
                            <strong>Marca un punto en la página</strong><br>
                            <small style="opacity: 0.8;">Haz clic en cualquier elemento para marcarlo</small>
                        </div>
                    </div>
                </div>
                
                <!-- Información cuando hay marcador seleccionado en notas básicas -->
                <div id="cm-simple-marker-selected" style="display: none; padding: 10px; background: rgba(39, 174, 96, 0.15); border-radius: 6px; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 8px; color: #27ae60; font-size: 11px;">
                            <span>✅</span>
                            <div>
                                <strong>Marcador establecido</strong><br>
                                <small>Coordenadas: (<span id="cm-simple-coordinates">0, 0</span>)</small>
                            </div>
                        </div>
                        <button type="button" class="cm-simple-btn-change-marker" 
                                style="background: #27ae60; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">
                            🎯 Cambiar
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="cm-simple-notes-form">
                <input type="text" class="cm-simple-form-input cm-simple-note-input" placeholder="Escribe una nota rápida...">
                <button class="cm-simple-btn-add">➕ Agregar</button>
            </div>
            
            <div class="cm-simple-notes-list">
                <!-- Las notas básicas aparecerán aquí -->
                <div class="cm-simple-notes-empty">
                    <div style="font-size: 32px; margin-bottom: 10px;">📍</div>
                    <div style="font-weight: bold; margin-bottom: 5px;">No hay notas marcadas aún</div>
                    <div style="font-size: 11px; opacity: 0.8;">Marca un punto y escribe tu primera nota</div>
                </div>
            </div>
        </div>
        
        <style>
        /* ESTILOS PARA MARCADORES VISUALES */
        .cm-markers-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 99995;
        }
        
        .cm-marker {
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #e91e63 0%, #ad1457 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            cursor: pointer;
            pointer-events: all;
            box-shadow: 0 4px 15px rgba(233, 30, 99, 0.4);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translate(-50%, -50%);
            border: 2px solid rgba(255, 255, 255, 0.9);
            z-index: 99996;
        }
        
        .cm-marker:hover {
            transform: translate(-50%, -50%) scale(1.2);
            box-shadow: 0 6px 20px rgba(233, 30, 99, 0.6);
            z-index: 99997;
        }
        
        .cm-marker-advanced {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
        }
        
        .cm-marker-advanced:hover {
            box-shadow: 0 6px 20px rgba(39, 174, 96, 0.6);
        }
        
        .cm-marker-simple {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
        }
        
        .cm-marker-simple:hover {
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.6);
        }
        
        .cm-marker-tooltip {
            position: absolute;
            bottom: 120%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 11px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 99998;
            max-width: 200px;
            word-break: break-word;
            white-space: normal;
        }
        
        .cm-marker-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: rgba(0, 0, 0, 0.9);
        }
        
        .cm-marker:hover .cm-marker-tooltip {
            opacity: 1;
        }
        
        .cm-marker-highlight {
            animation: markerHighlight 1s ease-out;
        }
        
        @keyframes markerHighlight {
            0%, 100% {
                transform: translate(-50%, -50%) scale(1);
                box-shadow: 0 4px 15px rgba(233, 30, 99, 0.4);
            }
            50% {
                transform: translate(-50%, -50%) scale(1.3);
                box-shadow: 0 8px 25px rgba(233, 30, 99, 0.8);
            }
        }
        
        .cm-marker-fade-in {
            animation: markerFadeIn 0.5s ease-out;
        }
        
        @keyframes markerFadeIn {
            from {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        .cm-marker-fade-out {
            animation: markerFadeOut 0.3s ease-out forwards;
        }
        
        @keyframes markerFadeOut {
            from {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            to {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
        }
        
        .cm-marker-pulse {
            animation: markerPulse 2s infinite;
        }
        
        @keyframes markerPulse {
            0%, 100% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            50% {
                opacity: 0.7;
                transform: translate(-50%, -50%) scale(1.05);
            }
        }
        
        .cm-temp-marker {
            background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%) !important;
            box-shadow: 0 4px 15px rgba(243, 156, 18, 0.4) !important;
        }
        
        /* MODO SELECCIÓN DE MARCADORES */
        .cm-marker-selection-mode {
            cursor: crosshair !important;
        }
        
        .cm-marker-selection-mode * {
            cursor: crosshair !important;
        }
        
        .cm-marker-selection-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(233, 30, 99, 0.1);
            z-index: 99994;
            pointer-events: none;
        }
        
        .cm-marker-selection-indicator {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #e91e63 0%, #ad1457 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            z-index: 99999;
            box-shadow: 0 4px 20px rgba(233, 30, 99, 0.3);
            animation: selectionIndicatorPulse 2s infinite;
        }
        
        @keyframes selectionIndicatorPulse {
            0%, 100% {
                transform: translateX(-50%) scale(1);
            }
            50% {
                transform: translateX(-50%) scale(1.05);
            }
        }
        
        /* ESTILOS PARA SECCIÓN DE MARCADORES EN MODAL */
        .cm-marker-section {
            background: rgba(39, 174, 96, 0.05);
            border: 1px solid rgba(39, 174, 96, 0.2);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 16px;
        }
        
        .cm-marker-instruction,
        .cm-marker-selected {
            padding: 12px;
            border-radius: 6px;
            border: 1px solid rgba(39, 174, 96, 0.3);
        }
        
        .cm-marker-instruction {
            background: rgba(39, 174, 96, 0.1);
            border-color: rgba(39, 174, 96, 0.3);
        }
        
        .cm-marker-selected {
            background: rgba(39, 174, 96, 0.15);
            border-color: rgba(39, 174, 96, 0.4);
        }
        
        .cm-marker-instruction-content,
        .cm-marker-selected-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .cm-marker-icon {
            font-size: 18px;
            flex-shrink: 0;
        }
        
        .cm-marker-instruction-text {
            color: #27ae60;
            font-size: 13px;
        }
        
        .cm-marker-instruction-text strong {
            color: #2ecc71;
        }
        
        .cm-marker-selected-info {
            flex: 1;
            color: #27ae60;
            font-size: 12px;
        }
        
        .cm-marker-selected-info strong {
            color: #2ecc71;
            font-size: 13px;
        }
        
        .cm-btn-change-marker {
            background: linear-gradient(135deg, #e91e63 0%, #ad1457 100%);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }
        
        .cm-btn-change-marker:hover {
            background: linear-gradient(135deg, #ad1457 0%, #e91e63 100%);
            transform: scale(1.05);
        }
        
        /* Estilos para el modal de notas avanzadas - ACTUALIZADOS */
        .cm-note-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .cm-note-modal-content {
            background: #2c3e50;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        
        .cm-note-modal-header {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            padding: 16px 20px;
            border-radius: 12px 12px 0 0;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .cm-note-modal-header h3 {
            margin: 0;
            font-size: 16px;
        }
        
        .cm-note-modal-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 14px;
        }
        
        .cm-note-modal-body {
            padding: 20px;
        }
        
        .cm-form-group {
            margin-bottom: 16px;
        }
        
        .cm-form-group label {
            display: block;
            color: #ecf0f1;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 6px;
        }
        
        .cm-form-group input,
        .cm-form-group textarea {
            width: 100%;
            padding: 10px 12px;
            border: 2px solid #34495e;
            background: #1a1a1a;
            color: #ecf0f1;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
            transition: border-color 0.3s ease;
        }
        
        .cm-form-group input:focus,
        .cm-form-group textarea:focus {
            outline: none;
            border-color: #27ae60;
            box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.1);
        }
        
        .cm-checklist-container {
            border: 1px solid #34495e;
            border-radius: 6px;
            padding: 10px;
            background: #1a1a1a;
        }
        
        .cm-checklist-item {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
            align-items: center;
        }
        
        .cm-checklist-item:last-child {
            margin-bottom: 0;
        }
        
        .cm-checklist-input {
            flex: 1;
            padding: 6px 8px !important;
            margin: 0 !important;
        }
        
        .cm-checklist-add,
        .cm-checklist-remove {
            background: #27ae60;
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            flex-shrink: 0;
        }
        
        .cm-checklist-remove {
            background: #e74c3c;
        }
        
        .cm-form-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid #34495e;
        }
        
        .cm-btn-cancel,
        .cm-btn-save {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .cm-btn-cancel {
            background: #7f8c8d;
            color: white;
        }
        
        .cm-btn-cancel:hover {
            background: #95a5a6;
        }
        
        .cm-btn-save {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
        }
        
        .cm-btn-save:hover {
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            transform: translateY(-1px);
        }
        
        /* Estilos para lista de notas avanzadas - CON MARCADORES */
        .cm-advanced-note {
            background: #34495e;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            border-left: 4px solid #27ae60;
            transition: all 0.3s ease;
        }
        
        .cm-advanced-note:hover {
            background: #3d566e;
            transform: translateX(4px);
        }
        
        .cm-advanced-note.cm-note-with-marker {
            border-left-color: #e91e63;
            cursor: pointer;
        }
        
        .cm-advanced-note.cm-note-with-marker:hover {
            border-left-color: #ad1457;
            box-shadow: 0 2px 8px rgba(233, 30, 99, 0.2);
        }
        
        .cm-advanced-note-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        
        .cm-advanced-note-title {
            font-size: 14px;
            font-weight: 600;
            color: #ecf0f1;
            margin: 0;
        }
        
        .cm-advanced-note-actions {
            display: flex;
            gap: 4px;
        }
        
        .cm-advanced-note-goto,
        .cm-advanced-note-edit,
        .cm-advanced-note-delete {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #bdc3c7;
            width: 24px;
            height: 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s ease;
        }
        
        .cm-advanced-note-goto:hover {
            background: #e91e63;
            color: white;
        }
        
        .cm-advanced-note-edit:hover {
            background: #3498db;
            color: white;
        }
        
        .cm-advanced-note-delete:hover {
            background: #e74c3c;
            color: white;
        }
        
        .cm-advanced-note-description {
            color: #bdc3c7;
            font-size: 12px;
            line-height: 1.4;
            margin-bottom: 8px;
        }
        
        .cm-advanced-note-url {
            color: #3498db;
            font-size: 11px;
            text-decoration: none;
            margin-bottom: 8px;
            display: block;
        }
        
        .cm-advanced-note-url:hover {
            text-decoration: underline;
        }
        
        .cm-advanced-note-checklist {
            list-style: none;
            padding: 0;
            margin: 8px 0 0 0;
        }
        
        .cm-advanced-note-checklist li {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 2px 0;
            font-size: 11px;
            color: #95a5a6;
        }
        
        .cm-advanced-note-checklist input[type="checkbox"] {
            margin: 0;
        }
        
        .cm-advanced-note-marker-info {
            background: rgba(233, 30, 99, 0.1);
            color: #e91e63;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            margin: 8px 0;
            display: inline-block;
        }
        
        .cm-advanced-note-meta {
            font-size: 10px;
            color: #7f8c8d;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(189, 195, 199, 0.1);
        }
        
        /* ESTILOS PARA NOTAS BÁSICAS CON MARCADORES */
        .cm-simple-note-item.cm-simple-note-with-marker {
            border-left: 3px solid #3498db;
            cursor: pointer;
        }
        
        .cm-simple-note-item.cm-simple-note-with-marker:hover {
            border-left-color: #2980b9;
            background: rgba(52, 152, 219, 0.05) !important;
        }
        
        .cm-simple-note-marker-info {
            background: rgba(52, 152, 219, 0.1);
            color: #3498db;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
            margin-top: 4px;
            display: inline-block;
        }
        
        /* RESPONSIVE PARA MARCADORES */
        @media (max-width: 768px) {
            .cm-marker {
                width: 28px;
                height: 28px;
                font-size: 14px;
            }
            
            .cm-marker-tooltip {
                font-size: 10px;
                padding: 4px 8px;
                max-width: 150px;
            }
            
            .cm-marker-selection-indicator {
                font-size: 12px;
                padding: 8px 16px;
            }
        }
        </style>
        
        <?php
    }
    
    // AJAX HANDLERS - TERMINAL CON VALIDACIÓN MEJORADA
    
    public function ajax_get_logs() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        wp_send_json_success(array(
            'php_logs' => $this->log_buffer,
            'total' => count($this->log_buffer)
        ));
    }
    
    public function ajax_clear_logs() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        $this->log_buffer = array();
        
        wp_send_json_success(array(
            'message' => 'Logs cleared'
        ));
    }
    
    // TABLA DE NOTAS ORIGINALES - CON MARCADORES
    
    public function create_notes_table() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE {$this->notes_table} (
            id int(11) NOT NULL AUTO_INCREMENT,
            title varchar(255) NOT NULL,
            description text,
            checklist longtext,
            url varchar(500),
            marker_x int(11) DEFAULT NULL,
            marker_y int(11) DEFAULT NULL,
            page_url varchar(500) DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY url_index (url(255)),
            KEY page_url_index (page_url(255)),
            KEY marker_index (marker_x, marker_y)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        error_log('Console Monitor: Notes table created successfully with markers support');
    }
    
    /**
     * Crear tabla de notas básicas - CON MARCADORES
     */
    public function create_simple_notes_table() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE {$this->simple_notes_table} (
            id int(11) NOT NULL AUTO_INCREMENT,
            text text NOT NULL,
            marker_x int(11) DEFAULT NULL,
            marker_y int(11) DEFAULT NULL,
            page_url varchar(500) DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY page_url_index (page_url(255)),
            KEY marker_index (marker_x, marker_y)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        error_log('Console Monitor: Simple notes table created successfully with markers support');
    }
    
    // AJAX HANDLERS - NOTAS AVANZADAS CON VALIDACIÓN MEJORADA
    
    public function ajax_get_notes() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        global $wpdb;
        
        try {
            // Verificar que la tabla existe
            if ($wpdb->get_var("SHOW TABLES LIKE '{$this->notes_table}'") !== $this->notes_table) {
                $this->create_notes_table();
            }
            
            $notes = $wpdb->get_results(
                "SELECT * FROM {$this->notes_table} ORDER BY updated_at DESC LIMIT 50"
            );
            
            $processed_notes = array();
            foreach ($notes as $note) {
                $checklist_data = array();
                if (!empty($note->checklist)) {
                    $decoded = json_decode($note->checklist, true);
                    if (is_array($decoded)) {
                        $checklist_data = $decoded;
                    }
                }
                
                $note_data = array(
                    'id' => intval($note->id),
                    'title' => $note->title,
                    'description' => $note->description,
                    'checklist' => $checklist_data,
                    'url' => $note->url,
                    'marker_x' => $note->marker_x ? intval($note->marker_x) : null,
                    'marker_y' => $note->marker_y ? intval($note->marker_y) : null,
                    'page_url' => $note->page_url,
                    'has_marker' => !empty($note->marker_x) && !empty($note->marker_y),
                    'created_at' => date('d/m/Y H:i', strtotime($note->created_at)),
                    'updated_at' => date('d/m/Y H:i', strtotime($note->updated_at))
                );
                
                $processed_notes[] = $note_data;
            }
            
            wp_send_json_success(array(
                'notes' => $processed_notes,
                'total' => count($processed_notes)
            ));
            
        } catch (Exception $e) {
            error_log('Get advanced notes error: ' . $e->getMessage());
            wp_send_json_error('Error al obtener notas avanzadas');
        }
    }
    
    public function ajax_save_note() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        // Obtener datos del POST
        $title = sanitize_text_field($_POST['title'] ?? '');
        $description = sanitize_textarea_field($_POST['description'] ?? '');
        $url = esc_url_raw($_POST['url'] ?? '');
        $checklist = $_POST['checklist'] ?? '';
        // NUEVO: Datos del marcador
        $marker_x = intval($_POST['marker_x'] ?? 0);
        $marker_y = intval($_POST['marker_y'] ?? 0);
        $page_url = esc_url_raw($_POST['page_url'] ?? '');
        
        // Validar datos requeridos
        if (empty($title)) {
            wp_send_json_error('El título es requerido');
            return;
        }
        
        // NUEVO: Validar marcador
        if (!$marker_x || !$marker_y) {
            wp_send_json_error('Debes marcar un punto en la página');
            return;
        }
        
        // Procesar checklist
        $checklist_data = array();
        if (!empty($checklist)) {
            if (is_string($checklist)) {
                $decoded = json_decode(stripslashes($checklist), true);
                if (is_array($decoded)) {
                    $checklist_data = $decoded;
                }
            } elseif (is_array($checklist)) {
                $checklist_data = $checklist;
            }
        }
        
        global $wpdb;
        
        try {
            $result = $wpdb->insert(
                $this->notes_table,
                array(
                    'title' => $title,
                    'description' => $description,
                    'checklist' => json_encode($checklist_data),
                    'url' => $url,
                    'marker_x' => $marker_x,
                    'marker_y' => $marker_y,
                    'page_url' => $page_url,
                    'created_at' => current_time('mysql'),
                    'updated_at' => current_time('mysql')
                ),
                array('%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s', '%s')
            );
            
            if ($result === false) {
                throw new Exception('Error en la base de datos: ' . $wpdb->last_error);
            }
            
            wp_send_json_success(array(
                'note_id' => $wpdb->insert_id,
                'message' => 'Nota con marcador guardada exitosamente'
            ));
            
        } catch (Exception $e) {
            error_log('Save advanced note error: ' . $e->getMessage());
            wp_send_json_error('Error al guardar nota avanzada: ' . $e->getMessage());
        }
    }
    
    public function ajax_update_note() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        $note_id = intval($_POST['note_id'] ?? 0);
        $title = sanitize_text_field($_POST['title'] ?? '');
        $description = sanitize_textarea_field($_POST['description'] ?? '');
        $url = esc_url_raw($_POST['url'] ?? '');
        $checklist = $_POST['checklist'] ?? '';
        // NUEVO: Datos del marcador
        $marker_x = intval($_POST['marker_x'] ?? 0);
        $marker_y = intval($_POST['marker_y'] ?? 0);
        $page_url = esc_url_raw($_POST['page_url'] ?? '');
        
        if (!$note_id || empty($title)) {
            wp_send_json_error('ID de nota y título son requeridos');
            return;
        }
        
        // NUEVO: Validar marcador
        if (!$marker_x || !$marker_y) {
            wp_send_json_error('Debes marcar un punto en la página');
            return;
        }
        
        // Procesar checklist
        $checklist_data = array();
        if (!empty($checklist)) {
            if (is_string($checklist)) {
                $decoded = json_decode(stripslashes($checklist), true);
                if (is_array($decoded)) {
                    $checklist_data = $decoded;
                }
            } elseif (is_array($checklist)) {
                $checklist_data = $checklist;
            }
        }
        
        global $wpdb;
        
        try {
            $result = $wpdb->update(
                $this->notes_table,
                array(
                    'title' => $title,
                    'description' => $description,
                    'checklist' => json_encode($checklist_data),
                    'url' => $url,
                    'marker_x' => $marker_x,
                    'marker_y' => $marker_y,
                    'page_url' => $page_url,
                    'updated_at' => current_time('mysql')
                ),
                array('id' => $note_id),
                array('%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s'),
                array('%d')
            );
            
            if ($result === false) {
                throw new Exception('Error en la base de datos: ' . $wpdb->last_error);
            }
            
            wp_send_json_success(array(
                'message' => 'Nota con marcador actualizada exitosamente'
            ));
            
        } catch (Exception $e) {
            error_log('Update advanced note error: ' . $e->getMessage());
            wp_send_json_error('Error al actualizar nota avanzada: ' . $e->getMessage());
        }
    }
    
    public function ajax_delete_note() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        $note_id = intval($_POST['note_id'] ?? 0);
        
        if (!$note_id) {
            wp_send_json_error('ID de nota inválido');
            return;
        }
        
        global $wpdb;
        
        try {
            $result = $wpdb->delete(
                $this->notes_table,
                array('id' => $note_id),
                array('%d')
            );
            
            if ($result === false) {
                throw new Exception('Error en la base de datos: ' . $wpdb->last_error);
            }
            
            wp_send_json_success(array(
                'message' => 'Nota con marcador eliminada exitosamente'
            ));
            
        } catch (Exception $e) {
            error_log('Delete advanced note error: ' . $e->getMessage());
            wp_send_json_error('Error al eliminar nota avanzada: ' . $e->getMessage());
        }
    }
    
    public function ajax_toggle_checklist_item() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        // Esta funcionalidad se implementará en el JavaScript del frontend
        wp_send_json_success(array('message' => 'Checklist item toggled'));
    }
    
    // AJAX HANDLERS - MARCADORES VISUALES CON VALIDACIÓN MEJORADA
    
    public function ajax_get_page_markers() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        global $wpdb;
        
        try {
            $current_url = $this->get_current_url();
            $markers = array();
            
            // Obtener marcadores de notas avanzadas
            $advanced_notes = $wpdb->get_results($wpdb->prepare(
                "SELECT id, title, marker_x, marker_y FROM {$this->notes_table} 
                 WHERE marker_x IS NOT NULL AND marker_y IS NOT NULL 
                 AND page_url = %s ORDER BY updated_at DESC",
                $current_url
            ));
            
            foreach ($advanced_notes as $note) {
                $markers[] = array(
                    'id' => intval($note->id),
                    'type' => 'advanced',
                    'title' => $note->title,
                    'x' => intval($note->marker_x),
                    'y' => intval($note->marker_y)
                );
            }
            
            // Obtener marcadores de notas básicas
            $simple_notes = $wpdb->get_results($wpdb->prepare(
                "SELECT id, text, marker_x, marker_y FROM {$this->simple_notes_table} 
                 WHERE marker_x IS NOT NULL AND marker_y IS NOT NULL 
                 AND page_url = %s ORDER BY created_at DESC",
                $current_url
            ));
            
            foreach ($simple_notes as $note) {
                $markers[] = array(
                    'id' => intval($note->id),
                    'type' => 'simple',
                    'title' => $note->text,
                    'x' => intval($note->marker_x),
                    'y' => intval($note->marker_y)
                );
            }
            
            wp_send_json_success(array(
                'markers' => $markers,
                'total' => count($markers),
                'page_url' => $current_url
            ));
            
        } catch (Exception $e) {
            error_log('Get page markers error: ' . $e->getMessage());
            wp_send_json_error('Error al obtener marcadores: ' . $e->getMessage());
        }
    }
    
    public function ajax_save_marker() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        // Esta funcionalidad se maneja en los save_note y save_simple_note
        wp_send_json_success(array('message' => 'Marker saved with note'));
    }
    
    public function ajax_remove_marker() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        // Esta funcionalidad se maneja en los delete_note y delete_simple_note
        wp_send_json_success(array('message' => 'Marker removed with note'));
    }
    
    // AJAX HANDLERS - NOTAS BÁSICAS CON VALIDACIÓN MEJORADA
    
    public function ajax_get_simple_notes() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        global $wpdb;
        
        try {
            // Verificar que la tabla existe
            if ($wpdb->get_var("SHOW TABLES LIKE '{$this->simple_notes_table}'") !== $this->simple_notes_table) {
                $this->create_simple_notes_table();
                wp_send_json_success(array('notes' => array(), 'total' => 0));
                return;
            }
            
            $notes = $wpdb->get_results(
                "SELECT * FROM {$this->simple_notes_table} ORDER BY created_at DESC LIMIT 50",
                ARRAY_A
            );
            
            $formatted_notes = array();
            foreach ($notes as $note) {
                $formatted_notes[] = array(
                    'id' => intval($note['id']),
                    'text' => $note['text'],
                    'marker_x' => $note['marker_x'] ? intval($note['marker_x']) : null,
                    'marker_y' => $note['marker_y'] ? intval($note['marker_y']) : null,
                    'page_url' => $note['page_url'],
                    'has_marker' => !empty($note['marker_x']) && !empty($note['marker_y']),
                    'created_at' => date('d/m/Y H:i', strtotime($note['created_at']))
                );
            }
            
            wp_send_json_success(array(
                'notes' => $formatted_notes,
                'total' => count($formatted_notes)
            ));
            
        } catch (Exception $e) {
            error_log('Get simple notes error: ' . $e->getMessage());
            wp_send_json_error('Error al obtener notas básicas: ' . $e->getMessage());
        }
    }
    
    public function ajax_save_simple_note() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        $note_text = sanitize_textarea_field($_POST['note_text'] ?? '');
        // NUEVO: Datos del marcador
        $marker_x = intval($_POST['marker_x'] ?? 0);
        $marker_y = intval($_POST['marker_y'] ?? 0);
        $page_url = esc_url_raw($_POST['page_url'] ?? '');
        
        if (empty($note_text)) {
            wp_send_json_error('El texto de la nota es requerido');
            return;
        }
        
        // NUEVO: Validar marcador
        if (!$marker_x || !$marker_y) {
            wp_send_json_error('Debes marcar un punto en la página');
            return;
        }
        
        global $wpdb;
        
        try {
            // Verificar que la tabla existe
            if ($wpdb->get_var("SHOW TABLES LIKE '{$this->simple_notes_table}'") !== $this->simple_notes_table) {
                $this->create_simple_notes_table();
            }
            
            $result = $wpdb->insert(
                $this->simple_notes_table,
                array(
                    'text' => $note_text,
                    'marker_x' => $marker_x,
                    'marker_y' => $marker_y,
                    'page_url' => $page_url,
                    'created_at' => current_time('mysql')
                ),
                array('%s', '%d', '%d', '%s', '%s')
            );
            
            if ($result === false) {
                throw new Exception('Error en la base de datos: ' . $wpdb->last_error);
            }
            
            wp_send_json_success(array(
                'note_id' => $wpdb->insert_id,
                'message' => 'Nota básica con marcador guardada exitosamente'
            ));
            
        } catch (Exception $e) {
            error_log('Save simple note error: ' . $e->getMessage());
            wp_send_json_error('Error al guardar nota básica: ' . $e->getMessage());
        }
    }
    
    public function ajax_delete_simple_note() {
        if (!$this->validate_ajax_request()) {
            return;
        }
        
        $note_id = intval($_POST['note_id'] ?? 0);
        
        if (!$note_id) {
            wp_send_json_error('ID de nota inválido');
            return;
        }
        
        global $wpdb;
        
        try {
            $result = $wpdb->delete(
                $this->simple_notes_table,
                array('id' => $note_id),
                array('%d')
            );
            
            if ($result === false) {
                throw new Exception('Error en la base de datos: ' . $wpdb->last_error);
            }
            
            wp_send_json_success(array(
                'message' => 'Nota básica con marcador eliminada exitosamente'
            ));
            
        } catch (Exception $e) {
            error_log('Delete simple note error: ' . $e->getMessage());
            wp_send_json_error('Error al eliminar nota básica: ' . $e->getMessage());
        }
    }
}

/**
 * Inicializar plugin
 */
function console_monitor_pro() {
    return ConsoleMonitorPro::get_instance();
}

add_action('plugins_loaded', 'console_monitor_pro');

// Hook adicional para debugging mejorado CON MARCADORES
if (defined('WP_DEBUG') && WP_DEBUG) {
    add_action('wp_loaded', function() {
        if (current_user_can('edit_posts')) {
            global $wpdb;
            $table_name = $wpdb->prefix . 'console_monitor_notes';
            $simple_table_name = $wpdb->prefix . 'cm_simple_notes';
            
            $exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
            $simple_exists = $wpdb->get_var("SHOW TABLES LIKE '$simple_table_name'") === $simple_table_name;
            
            error_log("Console Monitor Debug: Advanced notes table exists = " . ($exists ? 'YES' : 'NO'));
            error_log("Console Monitor Debug: Simple notes table exists = " . ($simple_exists ? 'YES' : 'NO'));
            
            if ($exists) {
                $count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
                $markers_count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE marker_x IS NOT NULL AND marker_y IS NOT NULL");
                error_log("Console Monitor Debug: Advanced notes count = $count (with markers: $markers_count)");
            }
            
            if ($simple_exists) {
                $simple_count = $wpdb->get_var("SELECT COUNT(*) FROM $simple_table_name");
                $simple_markers_count = $wpdb->get_var("SELECT COUNT(*) FROM $simple_table_name WHERE marker_x IS NOT NULL AND marker_y IS NOT NULL");
                error_log("Console Monitor Debug: Simple notes count = $simple_count (with markers: $simple_markers_count)");
            }
            
            // Verificar permisos - ACTUALIZADO
            error_log("Console Monitor Debug: Current user can manage options = " . (current_user_can('manage_options') ? 'YES' : 'NO'));
            error_log("Console Monitor Debug: Current user can edit posts = " . (current_user_can('edit_posts') ? 'YES' : 'NO'));
            error_log("Console Monitor Debug: Current user ID = " . get_current_user_id());
            error_log("Console Monitor Debug: AJAX URL = " . admin_url('admin-ajax.php'));
            error_log("Console Monitor Debug: Markers system enabled = YES");
            error_log("Console Monitor Debug: WP_DEBUG = " . (defined('WP_DEBUG') && WP_DEBUG ? 'YES' : 'NO'));
        }
    });
}

?>