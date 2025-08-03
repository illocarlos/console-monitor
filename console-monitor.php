<?php
/**
 * Plugin Name: Console Monitor Pro
 * Plugin URI: https://github.com/tu-usuario/console-monitor-pro
 * Description: Terminal de debugging y visor móvil flotante
 * Version: 2.0
 * Author: Tu Nombre
 * License: GPL v2 or later
 * Text Domain: console-monitor-pro
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes del plugin
define('CONSOLE_MONITOR_VERSION', '2.0');
define('CONSOLE_MONITOR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CONSOLE_MONITOR_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CONSOLE_MONITOR_ASSETS_URL', CONSOLE_MONITOR_PLUGIN_URL . 'assets/');

/**
 * Clase principal del plugin simplificada
 */
class ConsoleMonitorPro {
    
    private static $instance = null;
    private $log_buffer = array();
    private $max_logs = 100;
    
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
        $this->init();
    }
    
    /**
     * Inicializar el plugin
     */
    private function init() {
        // Solo para administradores
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Hooks básicos
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('wp_head', array($this, 'inject_console_interceptor'), 1);
        add_action('admin_head', array($this, 'inject_console_interceptor'), 1);
        add_action('wp_footer', array($this, 'render_floating_interface'));
        add_action('admin_footer', array($this, 'render_floating_interface'));
        
        // AJAX handlers
        add_action('wp_ajax_cm_get_logs', array($this, 'ajax_get_logs'));
        add_action('wp_ajax_cm_clear_logs', array($this, 'ajax_clear_logs'));
        
        // Error handler PHP
        $this->setup_error_handling();
    }
    
    /**
     * Enqueue assets
     */
    public function enqueue_assets() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // CSS único
        wp_enqueue_style(
            'console-monitor-styles',
            CONSOLE_MONITOR_ASSETS_URL . 'css/console-monitor-simple.css',
            array(),
            CONSOLE_MONITOR_VERSION
        );
        
        // JS único
        wp_enqueue_script('jquery');
        wp_enqueue_script(
            'console-monitor-script',
            CONSOLE_MONITOR_ASSETS_URL . 'js/console-monitor-simple.js',
            array('jquery'),
            CONSOLE_MONITOR_VERSION,
            true
        );
        
        // Localizar datos
        wp_localize_script('console-monitor-script', 'cmData', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('console_monitor_nonce'),
            'current_url' => home_url($_SERVER['REQUEST_URI'])
        ));
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
        // Console Monitor - Interceptor
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
            
            // Función para capturar logs
            function capture(type, args) {
                const message = Array.from(args).map(arg => {
                    if (typeof arg === 'object') {
                        try { return JSON.stringify(arg, null, 2); }
                        catch(e) { return '[Object]'; }
                    }
                    return String(arg);
                }).join(' ');
                
                const entry = {
                    type: type,
                    message: message,
                    time: new Date().toLocaleTimeString(),
                    source: ''
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
                
                window.CMPro.logs.push(entry);
                
                // Limitar buffer
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
        
        // Limitar buffer
        if (count($this->log_buffer) > $this->max_logs) {
            $this->log_buffer = array_slice($this->log_buffer, -80);
        }
        
        return false;
    }
    
    /**
     * Renderizar interfaz flotante
     */
    public function render_floating_interface() {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        
        <!-- Contenedor Flotante con Animaciones -->
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
                <button class="cm-option-btn terminal" title="Terminal de Console">
                    🐛
                </button>
                <button class="cm-option-btn iphone" title="Vista iPhone - TicTac">
                    📱
                </button>
            </div>
        </div>
        
        <!-- Panel Terminal -->
        <div id="cm-terminal" class="cm-panel cm-terminal">
            <div class="cm-panel-header">
                <div class="cm-panel-title">
                    <span class="cm-title-icon">🐛</span>
                    <span>Console Terminal</span>
                </div>
                <div class="cm-panel-controls">
                    <button class="cm-btn-clear" title="Clear">🗑️</button>
                    <button class="cm-btn-close" title="Close">✕</button>
                </div>
            </div>
            <div class="cm-panel-body">
                <div class="cm-logs-container" id="cm-logs">
                    <!-- Los logs se cargarán aquí -->
                </div>
            </div>
            <div class="cm-panel-footer">
                <span class="cm-logs-count">0 logs</span>
            </div>
        </div>
        
        <!-- Panel iPhone -->
        <div id="cm-iphone" class="cm-panel cm-iphone">
            <div class="cm-panel-header">
                <div class="cm-panel-title">
                    <span class="cm-title-icon">📱</span>
                    <span>iPhone Viewer</span>
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
                    <button class="cm-btn-rotate" title="Rotate">🔄</button>
                    <button class="cm-btn-close" title="Close">✕</button>
                </div>
            </div>
            <div class="cm-panel-body">
                <div class="cm-iphone-frame" id="cm-iphone-frame">
                    <div class="cm-iphone-screen">
                        <iframe id="cm-iphone-iframe" 
                                src="<?php echo esc_url(home_url($_SERVER['REQUEST_URI'])); ?>"
                                frameborder="0">
                        </iframe>
                    </div>
                    <div class="cm-iphone-notch"></div>
                    <div class="cm-iphone-home-indicator"></div>
                </div>
            </div>
            <div class="cm-panel-footer">
                <span class="cm-device-info" id="cm-device-info">iPhone 15 Pro • 393×852</span>
            </div>
        </div>
        
        <!-- Overlay -->
        <div id="cm-overlay" class="cm-overlay"></div>
        
        <?php
    }
    
    /**
     * AJAX: Obtener logs
     */
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
    
    /**
     * AJAX: Limpiar logs
     */
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
}

/**
 * Inicializar plugin
 */
function console_monitor_pro() {
    return ConsoleMonitorPro::get_instance();
}

add_action('plugins_loaded', 'console_monitor_pro');
?>