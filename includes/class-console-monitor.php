<?php
/**
 * Clase para gestionar el monitor de consola
 * Refactorización de la funcionalidad original
 * 
 * @package ConsoleMonitorPro
 * @since 2.0
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

class Console_Monitor_Console {
    
    private $error_handler_set = false;
    private $is_visible = false;
    private $auto_refresh_enabled = false;
    private $file_monitor_enabled = false;
    private $log_buffer = array();
    private $max_logs = 200;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->init();
    }
    
    /**
     * Inicializar el monitor de consola
     */
    public function init() {
        // Solo para administradores
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Hooks de WordPress
        add_action('wp_head', array($this, 'inject_console_interceptor'), 1);
        add_action('admin_head', array($this, 'inject_console_interceptor'), 1);
        add_action('wp_footer', array($this, 'render_console_panel'));
        add_action('admin_footer', array($this, 'render_console_panel'));
        add_action('wp_loaded', array($this, 'setup_error_handling'));
        
        // AJAX handlers
        add_action('wp_ajax_console_monitor_toggle', array($this, 'ajax_toggle_console'));
        add_action('wp_ajax_console_monitor_clear', array($this, 'ajax_clear_logs'));
        add_action('wp_ajax_console_monitor_get_logs', array($this, 'ajax_get_logs'));
        add_action('wp_ajax_console_monitor_file_changes', array($this, 'ajax_monitor_file_changes'));
        add_action('wp_ajax_console_monitor_settings', array($this, 'ajax_update_settings'));
    }
    
    /**
     * Inyectar interceptor de console temprano
     */
    public function inject_console_interceptor() {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        <script type="text/javascript">
        // Console Monitor Pro - Interceptor temprano
        window.ConsoleMonitorPro = window.ConsoleMonitorPro || {};
        window.ConsoleMonitorPro.logBuffer = [];
        
        (function() {
            // Guardar métodos originales
            window.ConsoleMonitorPro.originalConsole = {
                log: console.log,
                error: console.error,
                warn: console.warn,
                info: console.info,
                debug: console.debug
            };
            
            // Función para detectar si es log del usuario
            function isUserLog(message) {
                var systemPatterns = [
                    /TypeError:/i, /ReferenceError:/i, /SyntaxError:/i, /Uncaught/i,
                    /Failed to fetch/i, /404|403|500/i, /wordpress/i, /jquery/i,
                    /wp-/i, /admin-ajax/i
                ];
                
                return !systemPatterns.some(pattern => pattern.test(message));
            }
            
            // Función para capturar logs
            function captureLog(type, args) {
                var message = Array.prototype.slice.call(args).map(function(arg) {
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg, null, 2);
                        } catch(e) {
                            return '[Object]';
                        }
                    }
                    return String(arg);
                }).join(' ');
                
                var logEntry = {
                    type: type,
                    message: message,
                    timestamp: new Date().toLocaleTimeString(),
                    category: isUserLog(message) ? 'user' : 'system',
                    logType: 'js',
                    source: ''
                };
                
                // Intentar obtener stack trace para el source
                try {
                    var stack = new Error().stack;
                    if (stack) {
                        var lines = stack.split('\n');
                        for (var i = 2; i < lines.length; i++) {
                            if (lines[i] && !lines[i].includes('console-monitor')) {
                                var match = lines[i].match(/(?:at\s+)?(?:.*?\s+)?\(?(.+?):(\d+):(\d+)\)?/);
                                if (match) {
                                    logEntry.source = match[1].split('/').pop() + ':' + match[2];
                                    break;
                                }
                            }
                        }
                    }
                } catch(e) {
                    // Ignorar errores de stack trace
                }
                
                window.ConsoleMonitorPro.logBuffer.push(logEntry);
                
                // Limitar buffer
                if (window.ConsoleMonitorPro.logBuffer.length > 200) {
                    window.ConsoleMonitorPro.logBuffer = window.ConsoleMonitorPro.logBuffer.slice(-150);
                }
            }
            
            // Interceptar métodos de console
            console.log = function() {
                window.ConsoleMonitorPro.originalConsole.log.apply(console, arguments);
                captureLog('log', arguments);
            };
            
            console.error = function() {
                window.ConsoleMonitorPro.originalConsole.error.apply(console, arguments);
                captureLog('error', arguments);
            };
            
            console.warn = function() {
                window.ConsoleMonitorPro.originalConsole.warn.apply(console, arguments);
                captureLog('warn', arguments);
            };
            
            console.info = function() {
                window.ConsoleMonitorPro.originalConsole.info.apply(console, arguments);
                captureLog('info', arguments);
            };
            
            console.debug = function() {
                window.ConsoleMonitorPro.originalConsole.debug.apply(console, arguments);
                captureLog('debug', arguments);
            };
            
            // Capturar errores JavaScript globales
            window.addEventListener('error', function(e) {
                var logEntry = {
                    type: 'error',
                    message: e.message,
                    timestamp: new Date().toLocaleTimeString(),
                    category: 'system',
                    logType: 'js',
                    source: e.filename ? e.filename.split('/').pop() + ':' + e.lineno : ''
                };
                
                window.ConsoleMonitorPro.logBuffer.push(logEntry);
            });
            
            // Capturar promesas rechazadas
            window.addEventListener('unhandledrejection', function(e) {
                var logEntry = {
                    type: 'error',
                    message: 'Unhandled Promise Rejection: ' + (e.reason || 'Unknown'),
                    timestamp: new Date().toLocaleTimeString(),
                    category: 'system',
                    logType: 'js',
                    source: ''
                };
                
                window.ConsoleMonitorPro.logBuffer.push(logEntry);
            });
        })();
        </script>
        <?php
    }
    
    /**
     * Configurar manejo de errores PHP
     */
    public function setup_error_handling() {
        if ($this->error_handler_set || !current_user_can('manage_options')) {
            return;
        }
        
        $this->error_handler_set = true;
        
        // Solo capturar warnings y notices, no fatales
        set_error_handler(array($this, 'php_error_handler'), 
            E_WARNING | E_NOTICE | E_USER_WARNING | E_USER_NOTICE | E_DEPRECATED | E_USER_DEPRECATED
        );
    }
    
    /**
     * Manejador de errores PHP
     */
    public function php_error_handler($severity, $message, $file, $line) {
        if (!(error_reporting() & $severity)) {
            return false;
        }
        
        // Evitar capturar errores del propio plugin
        if (strpos($file, 'console-monitor') !== false) {
            return false;
        }
        
        $error_types = array(
            E_WARNING => 'PHP_WARNING',
            E_NOTICE => 'PHP_NOTICE',
            E_USER_WARNING => 'PHP_USER_WARNING',
            E_USER_NOTICE => 'PHP_USER_NOTICE',
            E_DEPRECATED => 'PHP_DEPRECATED',
            E_USER_DEPRECATED => 'PHP_USER_DEPRECATED'
        );
        
        $type = isset($error_types[$severity]) ? $error_types[$severity] : 'PHP_UNKNOWN';
        $is_user_error = $this->is_user_error($message, $file);
        
        // Añadir al buffer de logs
        $this->add_log_entry($type, $message, basename($file) . ':' . $line, 'php', $is_user_error ? 'user' : 'system');
        
        return false;
    }
    
    /**
     * Determinar si es un error del usuario
     */
    private function is_user_error($message, $file) {
        $theme_path = get_template_directory();
        $child_theme_path = get_stylesheet_directory();
        
        // Si el archivo está en el tema
        if (strpos($file, $theme_path) !== false || strpos($file, $child_theme_path) !== false) {
            return true;
        }
        
        // Si contiene palabras clave de debugging
        $debug_keywords = array('debug', 'test', 'log:', 'var_dump', 'print_r');
        $message_lower = strtolower($message);
        
        foreach ($debug_keywords as $keyword) {
            if (strpos($message_lower, $keyword) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Añadir entrada al log
     */
    private function add_log_entry($type, $message, $source, $logType, $category) {
        $this->log_buffer[] = array(
            'type' => $type,
            'message' => $message,
            'source' => $source,
            'timestamp' => date('H:i:s'),
            'logType' => $logType,
            'category' => $category
        );
        
        // Limitar buffer
        if (count($this->log_buffer) > $this->max_logs) {
            $this->log_buffer = array_slice($this->log_buffer, -($this->max_logs / 2));
        }
    }
    
    /**
     * Renderizar panel de consola
     */
    public function render_console_panel() {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        
        <!-- Panel de Console Monitor -->
        <div id="cm-console-panel" class="cm-console-panel" style="display: none;">
            <div class="cm-console-header">
                <div class="cm-console-title">
                    <span class="cm-console-icon">🐛</span>
                    <h3>Console Monitor</h3>
                    <span class="cm-console-status" id="cm-console-status">●</span>
                </div>
                
                <div class="cm-console-controls">
                    <div class="cm-console-filters">
                        <button class="cm-filter-btn cm-filter-active" data-filter="user">
                            <span>👤</span> My Logs
                        </button>
                        <button class="cm-filter-btn" data-filter="system">
                            <span>⚙️</span> System
                        </button>
                        <button class="cm-filter-btn" data-filter="all">
                            <span>📋</span> All
                        </button>
                    </div>
                    
                    <div class="cm-console-actions">
                        <button class="cm-action-btn" id="cm-auto-refresh-btn" title="Auto-refresh">
                            <span>🔄</span>
                        </button>
                        <button class="cm-action-btn" id="cm-file-monitor-btn" title="File Monitor">
                            <span>📁</span>
                        </button>
                        <button class="cm-action-btn" id="cm-clear-logs-btn" title="Clear Logs">
                            <span>🗑️</span>
                        </button>
                        <button class="cm-action-btn" id="cm-console-settings-btn" title="Settings">
                            <span>⚙️</span>
                        </button>
                        <button class="cm-action-btn" id="cm-minimize-console-btn" title="Minimize">
                            <span>−</span>
                        </button>
                        <button class="cm-action-btn" id="cm-close-console-btn" title="Close">
                            <span>✕</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="cm-console-content">
                <div class="cm-console-logs" id="cm-console-logs">
                    <!-- Los logs se cargarán aquí dinámicamente -->
                </div>
            </div>
            
            <div class="cm-console-footer">
                <div class="cm-console-stats">
                    <span class="cm-stat" id="cm-total-logs">Total: 0</span>
                    <span class="cm-stat" id="cm-user-logs">User: 0</span>
                    <span class="cm-stat" id="cm-system-logs">System: 0</span>
                </div>
            </div>
        </div>
        
        <!-- Resizer para el panel -->
        <div id="cm-console-resizer" class="cm-console-resizer" style="display: none;"></div>
        
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Inicializar console monitor cuando esté listo
            if (typeof ConsoleMonitorConsole !== 'undefined') {
                ConsoleMonitorConsole.init({
                    ajaxUrl: '<?php echo admin_url('admin-ajax.php'); ?>',
                    nonce: '<?php echo wp_create_nonce('console_monitor_nonce'); ?>',
                    maxLogs: <?php echo $this->max_logs; ?>,
                    autoRefresh: <?php echo $this->auto_refresh_enabled ? 'true' : 'false'; ?>,
                    fileMonitor: <?php echo $this->file_monitor_enabled ? 'true' : 'false'; ?>
                });
            }
        });
        </script>
        
        <?php
    }
    
    /**
     * AJAX: Toggle del panel de consola
     */
    public function ajax_toggle_console() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $this->is_visible = !$this->is_visible;
        
        wp_send_json_success(array(
            'is_visible' => $this->is_visible,
            'message' => $this->is_visible ? 'Console abierta' : 'Console cerrada'
        ));
    }
    
    /**
     * AJAX: Limpiar logs
     */
    public function ajax_clear_logs() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $this->log_buffer = array();
        
        wp_send_json_success(array(
            'message' => 'Logs limpiados'
        ));
    }
    
    /**
     * AJAX: Obtener logs
     */
    public function ajax_get_logs() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $filter = sanitize_text_field($_POST['filter'] ?? 'all');
        $last_id = intval($_POST['last_id'] ?? 0);
        
        $filtered_logs = array();
        
        foreach ($this->log_buffer as $index => $log) {
            if ($index <= $last_id) continue;
            
            if ($filter === 'all' || $log['category'] === $filter) {
                $filtered_logs[] = array_merge($log, array('id' => $index));
            }
        }
        
        wp_send_json_success(array(
            'logs' => $filtered_logs,
            'total_count' => count($this->log_buffer),
            'last_id' => count($this->log_buffer) - 1
        ));
    }
    
    /**
     * AJAX: Monitor de cambios en archivos
     */
    public function ajax_monitor_file_changes() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $theme_path = get_template_directory();
        $child_theme_path = get_stylesheet_directory();
        $file_changes = array();
        
        // Obtener archivos modificados recientemente
        $files_to_check = $this->get_theme_files(array($theme_path, $child_theme_path));
        $current_time = time();
        
        foreach ($files_to_check as $file) {
            if (file_exists($file)) {
                $modified_time = filemtime($file);
                
                // Archivos modificados en los últimos 10 segundos
                if ($current_time - $modified_time < 10) {
                    $console_logs = $this->extract_console_logs($file);
                    
                    if (!empty($console_logs)) {
                        $file_changes[] = array(
                            'file' => basename($file),
                            'path' => $file,
                            'modified' => date('H:i:s', $modified_time),
                            'console_logs' => $console_logs
                        );
                    }
                }
            }
        }
        
        wp_send_json_success($file_changes);
    }
    
    /**
     * Obtener archivos del tema para monitorear
     */
    private function get_theme_files($directories) {
        $files = array();
        
        foreach ($directories as $directory) {
            if (!is_dir($directory)) continue;
            
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::LEAVES_ONLY
            );
            
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $extension = strtolower($file->getExtension());
                    if (in_array($extension, array('php', 'js'))) {
                        $files[] = $file->getPathname();
                    }
                }
            }
        }
        
        return $files;
    }
    
    /**
     * Extraer console.logs de archivos
     */
    private function extract_console_logs($file_path) {
        if (!file_exists($file_path) || !is_readable($file_path)) {
            return array();
        }
        
        $content = file_get_contents($file_path);
        $console_logs = array();
        
        // Buscar console.log, console.error, etc.
        preg_match_all('/console\.(log|error|warn|info|debug)\s*\(\s*[\'"]([^\'"]*)[\'"]/', $content, $matches, PREG_SET_ORDER);
        
        foreach ($matches as $match) {
            $console_logs[] = array(
                'type' => $match[1],
                'message' => $match[2],
                'file' => basename($file_path)
            );
        }
        
        return $console_logs;
    }
    
    /**
     * AJAX: Actualizar configuración
     */
    public function ajax_update_settings() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $settings = array(
            'auto_refresh' => isset($_POST['auto_refresh']) ? (bool) $_POST['auto_refresh'] : false,
            'file_monitor' => isset($_POST['file_monitor']) ? (bool) $_POST['file_monitor'] : false,
            'max_logs' => isset($_POST['max_logs']) ? intval($_POST['max_logs']) : 200
        );
        
        $this->auto_refresh_enabled = $settings['auto_refresh'];
        $this->file_monitor_enabled = $settings['file_monitor'];
        $this->max_logs = $settings['max_logs'];
        
        wp_send_json_success(array(
            'settings' => $settings,
            'message' => 'Configuración actualizada'
        ));
    }
    
    /**
     * Métodos públicos para acceso externo
     */
    public function show() {
        $this->is_visible = true;
    }
    
    public function hide() {
        $this->is_visible = false;
    }
    
    public function is_visible() {
        return $this->is_visible;
    }
    
    public function get_logs() {
        return $this->log_buffer;
    }
    
    public function clear_logs() {
        $this->log_buffer = array();
    }
}
?>