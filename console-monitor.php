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
 * Clase principal del plugin - TODO EN UNO + SISTEMA BÁSICO DE NOTAS
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
     * Inicializar el plugin completo
     */
    private function init() {
        // Solo para administradores
        if (!current_user_can('manage_options')) {
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
        
        // AJAX handlers - NOTAS ORIGINALES
        add_action('wp_ajax_cm_get_notes', array($this, 'ajax_get_notes'));
        add_action('wp_ajax_cm_save_note', array($this, 'ajax_save_note'));
        add_action('wp_ajax_cm_delete_note', array($this, 'ajax_delete_note'));
        add_action('wp_ajax_cm_toggle_checklist_item', array($this, 'ajax_toggle_checklist_item'));
        add_action('wp_ajax_cm_save_marker', array($this, 'ajax_save_marker'));
        add_action('wp_ajax_cm_remove_marker', array($this, 'ajax_remove_marker'));
        
        // AJAX handlers - NOTAS BÁSICAS
        add_action('wp_ajax_cm_get_simple_notes', array($this, 'ajax_get_simple_notes'));
        add_action('wp_ajax_cm_save_simple_note', array($this, 'ajax_save_simple_note'));
        add_action('wp_ajax_cm_delete_simple_note', array($this, 'ajax_delete_simple_note'));
        
        // Error handler PHP
        $this->setup_error_handling();
        
        // Hook de activación
        register_activation_hook(__FILE__, array($this, 'plugin_activation'));
    }
    
    /**
     * Verificar y crear tabla si no existe
     */
    public function maybe_create_notes_table() {
        global $wpdb;
        
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$this->notes_table}'") === $this->notes_table;
        
        if (!$table_exists) {
            $this->create_notes_table();
            error_log('Console Monitor: Notes table created on init');
        }
    }
    
    /**
     * Verificar y crear tabla de notas básicas
     */
    public function maybe_create_simple_notes_table() {
        global $wpdb;
        
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$this->simple_notes_table}'") === $this->simple_notes_table;
        
        if (!$table_exists) {
            $this->create_simple_notes_table();
            error_log('Console Monitor: Simple notes table created on init');
        }
    }
    
    /**
     * Activación del plugin
     */
    public function plugin_activation() {
        $this->create_notes_table();
        $this->create_simple_notes_table();
        error_log('Console Monitor: Plugin activated and tables created');
    }
    
    /**
     * Enqueue assets modulares
     */
    public function enqueue_assets() {
        if (!current_user_can('manage_options')) {
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
        
        // Notas
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
        
        // Localizar datos para todos los módulos
        wp_localize_script('cm-core', 'cmData', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('console_monitor_nonce'),
            'current_url' => $this->get_current_url()
        ));
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
        if (!current_user_can('manage_options')) {
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
     * Renderizar TODA la interfaz flotante
     */
    public function render_floating_interface() {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        
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
                <button class="cm-option-btn notes" title="Notas y Marcadores" data-panel="notes">
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
        
        <!-- SISTEMA ORIGINAL - Panel de Notas -->
        <div id="cm-notes" class="cm-panel cm-notes">
            <div class="cm-panel-header">
                <div class="cm-panel-title">
                    <span class="cm-title-icon">📝</span>
                    <span>Notas y Marcadores</span>
                </div>
                <div class="cm-panel-controls">
                    <div class="cm-notes-header-actions">
                        <button class="cm-btn-add-note" title="Nueva Nota">
                            <span>➕</span>
                            <span class="cm-btn-text">Nueva</span>
                        </button>
                    </div>
                    <button class="cm-btn-close" title="Cerrar">✕</button>
                </div>
            </div>
            <div class="cm-panel-body">
                <div class="cm-notes-container" id="cm-notes-container">
                    <!-- Las notas se cargarán aquí -->
                </div>
            </div>
            <div class="cm-panel-footer">
                <span class="cm-notes-count">0 notas</span>
                <span style="font-size: 10px; opacity: 0.7;">Ctrl+Shift+N</span>
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
        
        <!-- NUEVO SISTEMA DE NOTAS BÁSICAS -->
        
        <!-- Botón flotante para notas básicas -->
        <button class="cm-simple-toggle-btn" title="Notas Rápidas">📝
            <span class="cm-simple-notes-count" style="display: none;">0</span>
        </button>
        
        <!-- Widget de notas básicas -->
        <div class="cm-simple-notes-widget">
            <div class="cm-simple-notes-header">
                <div class="cm-simple-notes-title">📝 Notas Rápidas</div>
                <button class="cm-simple-btn-close">✕</button>
            </div>
            
            <div class="cm-simple-notes-form">
                <input type="text" class="cm-simple-form-input cm-simple-note-input" placeholder="Escribe una nota rápida...">
                <button class="cm-simple-btn-add">➕ Agregar</button>
            </div>
            
            <div class="cm-simple-notes-list">
                <!-- Las notas básicas aparecerán aquí -->
            </div>
        </div>
        
        <?php
    }
    
    // AJAX HANDLERS - TERMINAL
    
    public function ajax_get_logs() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce') || 
            !current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        wp_send_json_success(array(
            'php_logs' => $this->log_buffer,
            'total' => count($this->log_buffer)
        ));
    }
    
    public function ajax_clear_logs() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce') || 
            !current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $this->log_buffer = array();
        
        wp_send_json_success(array(
            'message' => 'Logs cleared'
        ));
    }
    
    // TABLA DE NOTAS ORIGINALES
    
    public function create_notes_table() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE {$this->notes_table} (
            id int(11) NOT NULL AUTO_INCREMENT,
            title varchar(255) NOT NULL,
            description text,
            checklist longtext,
            url varchar(500),
            marker_x int(11),
            marker_y int(11),
            page_url varchar(500),
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY url_index (url(255)),
            KEY page_url_index (page_url(255))
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        error_log('Console Monitor: Notes table created successfully');
    }
    
    /**
     * Crear tabla de notas básicas
     */
    public function create_simple_notes_table() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE {$this->simple_notes_table} (
            id int(11) NOT NULL AUTO_INCREMENT,
            text text NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        error_log('Console Monitor: Simple notes table created successfully');
    }
    
    // AJAX HANDLERS - NOTAS ORIGINALES
    
    public function ajax_get_notes() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce') || 
            !current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        global $wpdb;
        
        if ($wpdb->get_var("SHOW TABLES LIKE '{$this->notes_table}'") !== $this->notes_table) {
            $this->create_notes_table();
        }
        
        $notes = $wpdb->get_results(
            "SELECT * FROM {$this->notes_table} ORDER BY created_at DESC LIMIT 50"
        );
        
        $processed_notes = array();
        foreach ($notes as $note) {
            $note_data = array(
                'id' => $note->id,
                'title' => $note->title,
                'description' => $note->description,
                'checklist' => $note->checklist ? json_decode($note->checklist, true) : array(),
                'url' => $note->url,
                'marker_x' => $note->marker_x,
                'marker_y' => $note->marker_y,
                'page_url' => $note->page_url,
                'created_at' => date('d/m/Y H:i', strtotime($note->created_at)),
                'updated_at' => $note->updated_at
            );
            
            if (!is_array($note_data['checklist'])) {
                $note_data['checklist'] = array();
            }
            
            $processed_notes[] = $note_data;
        }
        
        wp_send_json_success(array(
            'notes' => $processed_notes,
            'total' => count($processed_notes)
        ));
    }
    
    public function ajax_save_note() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce') || 
            !current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $note_data = json_decode(stripslashes($_POST['note_data']), true);
        
        if (!$note_data || empty($note_data['title'])) {
            wp_send_json_error('Datos de nota inválidos');
        }
        
        global $wpdb;
        
        $title = sanitize_text_field($note_data['title']);
        $description = sanitize_textarea_field($note_data['description'] ?? '');
        $checklist = json_encode($note_data['checklist'] ?? array());
        $url = esc_url_raw($note_data['url'] ?? '');
        
        $result = $wpdb->insert(
            $this->notes_table,
            array(
                'title' => $title,
                'description' => $description,
                'checklist' => $checklist,
                'url' => $url,
                'created_at' => current_time('mysql')
            ),
            array('%s', '%s', '%s', '%s', '%s')
        );
        
        if ($result === false) {
            error_log('Console Monitor: Error inserting note - ' . $wpdb->last_error);
            wp_send_json_error('Error al guardar la nota: ' . $wpdb->last_error);
        }
        
        wp_send_json_success(array(
            'note_id' => $wpdb->insert_id,
            'message' => 'Nota guardada exitosamente'
        ));
    }
    
    public function ajax_delete_note() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce') || 
            !current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $note_id = intval($_POST['note_id']);
        
        if (!$note_id) {
            wp_send_json_error('ID de nota inválido');
        }
        
        global $wpdb;
        
        $result = $wpdb->delete(
            $this->notes_table,
            array('id' => $note_id),
            array('%d')
        );
        
        if ($result === false) {
            wp_send_json_error('Error al eliminar la nota');
        }
        
        wp_send_json_success(array(
            'message' => 'Nota eliminada exitosamente'
        ));
    }
    
    public function ajax_toggle_checklist_item() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce') || 
            !current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        wp_send_json_success(array('message' => 'Checklist item toggled'));
    }
    
    public function ajax_save_marker() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce') || 
            !current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        wp_send_json_success(array('message' => 'Marker saved'));
    }
    
    public function ajax_remove_marker() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce') || 
            !current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        wp_send_json_success(array('message' => 'Marker removed'));
    }
    
    // AJAX HANDLERS - NOTAS BÁSICAS
    
    public function ajax_get_simple_notes() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce') || 
            !current_user_can('manage_options')) {
            wp_send_json_error('Sin permisos');
            return;
        }
        
        global $wpdb;
        
        try {
            $notes = $wpdb->get_results(
                "SELECT * FROM {$this->simple_notes_table} ORDER BY created_at DESC LIMIT 50",
                ARRAY_A
            );
            
            $formatted_notes = array();
            foreach ($notes as $note) {
                $formatted_notes[] = array(
                    'id' => intval($note['id']),
                    'text' => $note['text'],
                    'created_at' => date('d/m/Y H:i', strtotime($note['created_at']))
                );
            }
            
            wp_send_json_success(array(
                'notes' => $formatted_notes,
                'total' => count($formatted_notes)
            ));
            
        } catch (Exception $e) {
            error_log('Get simple notes error: ' . $e->getMessage());
            wp_send_json_error('Error al obtener notas básicas');
        }
    }
    
    public function ajax_save_simple_note() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce') || 
            !current_user_can('manage_options')) {
            wp_send_json_error('Sin permisos');
            return;
        }
        
        $note_text = sanitize_textarea_field($_POST['note_text']);
        
        if (empty($note_text)) {
            wp_send_json_error('Texto requerido');
            return;
        }
        
        global $wpdb;
        
        try {
            $result = $wpdb->insert(
                $this->simple_notes_table,
                array(
                    'text' => $note_text,
                    'created_at' => current_time('mysql')
                ),
                array('%s', '%s')
            );
            
            if ($result === false) {
                throw new Exception($wpdb->last_error);
            }
            
            wp_send_json_success(array(
                'note_id' => $wpdb->insert_id,
                'message' => 'Nota básica guardada'
            ));
            
        } catch (Exception $e) {
            error_log('Save simple note error: ' . $e->getMessage());
            wp_send_json_error('Error al guardar nota básica');
        }
    }
    
    public function ajax_delete_simple_note() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce') || 
            !current_user_can('manage_options')) {
            wp_send_json_error('Sin permisos');
            return;
        }
        
        $note_id = intval($_POST['note_id']);
        
        if (!$note_id) {
            wp_send_json_error('ID inválido');
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
                throw new Exception($wpdb->last_error);
            }
            
            wp_send_json_success(array(
                'message' => 'Nota básica eliminada'
            ));
            
        } catch (Exception $e) {
            error_log('Delete simple note error: ' . $e->getMessage());
            wp_send_json_error('Error al eliminar nota básica');
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

// Hook adicional para debugging
if (defined('WP_DEBUG') && WP_DEBUG) {
    add_action('wp_loaded', function() {
        if (current_user_can('manage_options')) {
            global $wpdb;
            $table_name = $wpdb->prefix . 'console_monitor_notes';
            $simple_table_name = $wpdb->prefix . 'cm_simple_notes';
            
            $exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
            $simple_exists = $wpdb->get_var("SHOW TABLES LIKE '$simple_table_name'") === $simple_table_name;
            
            error_log("Console Monitor Debug: Original table exists = " . ($exists ? 'YES' : 'NO'));
            error_log("Console Monitor Debug: Simple notes table exists = " . ($simple_exists ? 'YES' : 'NO'));
            
            if ($exists) {
                $count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
                error_log("Console Monitor Debug: Original notes count = $count");
            }
            
            if ($simple_exists) {
                $simple_count = $wpdb->get_var("SELECT COUNT(*) FROM $simple_table_name");
                error_log("Console Monitor Debug: Simple notes count = $simple_count");
            }
        }
    });
}

?>