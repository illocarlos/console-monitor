<?php
/**
 * Clase para gestionar el visor móvil
 * Permite ver la página en diferentes resoluciones móviles
 * 
 * @package ConsoleMonitorPro
 * @since 2.0
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

class Console_Monitor_Mobile_Viewer {
    
    private $is_active = false;
    private $current_device = 'iphone-12';
    private $device_presets = array();
    private $custom_dimensions = array('width' => 375, 'height' => 667);
    private $orientation = 'portrait';
    private $zoom_level = 1.0;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->init();
    }
    
    /**
     * Inicializar el visor móvil
     */
    public function init() {
        // Solo para administradores
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Configurar presets de dispositivos
        $this->setup_device_presets();
        
        // Hooks de WordPress
        add_action('wp_footer', array($this, 'render_mobile_viewer'));
        add_action('admin_footer', array($this, 'render_mobile_viewer'));
        
        // AJAX handlers
        add_action('wp_ajax_mobile_viewer_toggle', array($this, 'ajax_toggle_viewer'));
        add_action('wp_ajax_mobile_viewer_device', array($this, 'ajax_change_device'));
        add_action('wp_ajax_mobile_viewer_orientation', array($this, 'ajax_change_orientation'));
        add_action('wp_ajax_mobile_viewer_zoom', array($this, 'ajax_change_zoom'));
        add_action('wp_ajax_mobile_viewer_screenshot', array($this, 'ajax_take_screenshot'));
        add_action('wp_ajax_mobile_viewer_reload', array($this, 'ajax_reload_frame'));
    }
    
    /**
     * Configurar presets de dispositivos móviles
     */
    private function setup_device_presets() {
        $this->device_presets = array(
            'iphone-12' => array(
                'name' => 'iPhone 12',
                'width' => 390,
                'height' => 844,
                'pixelRatio' => 3,
                'userAgent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                'icon' => '📱',
                'category' => 'iPhone'
            ),
            'iphone-12-pro-max' => array(
                'name' => 'iPhone 12 Pro Max',
                'width' => 428,
                'height' => 926,
                'pixelRatio' => 3,
                'userAgent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                'icon' => '📱',
                'category' => 'iPhone'
            ),
            'iphone-se' => array(
                'name' => 'iPhone SE',
                'width' => 375,
                'height' => 667,
                'pixelRatio' => 2,
                'userAgent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                'icon' => '📱',
                'category' => 'iPhone'
            ),
            'samsung-galaxy-s21' => array(
                'name' => 'Samsung Galaxy S21',
                'width' => 360,
                'height' => 800,
                'pixelRatio' => 3,
                'userAgent' => 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
                'icon' => '📱',
                'category' => 'Android'
            ),
            'samsung-galaxy-note' => array(
                'name' => 'Samsung Galaxy Note',
                'width' => 412,
                'height' => 915,
                'pixelRatio' => 2.6,
                'userAgent' => 'Mozilla/5.0 (Linux; Android 11; SM-N975F) AppleWebKit/537.36',
                'icon' => '📱',
                'category' => 'Android'
            ),
            'pixel-5' => array(
                'name' => 'Google Pixel 5',
                'width' => 393,
                'height' => 851,
                'pixelRatio' => 2.75,
                'userAgent' => 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36',
                'icon' => '📱',
                'category' => 'Android'
            ),
            'ipad' => array(
                'name' => 'iPad',
                'width' => 768,
                'height' => 1024,
                'pixelRatio' => 2,
                'userAgent' => 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                'icon' => '📱',
                'category' => 'Tablet'
            ),
            'ipad-pro' => array(
                'name' => 'iPad Pro 11"',
                'width' => 834,
                'height' => 1194,
                'pixelRatio' => 2,
                'userAgent' => 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                'icon' => '📱',
                'category' => 'Tablet'
            ),
            'custom' => array(
                'name' => 'Custom Size',
                'width' => 375,
                'height' => 667,
                'pixelRatio' => 2,
                'userAgent' => 'Custom',
                'icon' => '⚙️',
                'category' => 'Custom'
            )
        );
        
        // Filtro para permitir personalización
        $this->device_presets = apply_filters('console_monitor_device_presets', $this->device_presets);
    }
    
    /**
     * Renderizar el visor móvil
     */
    public function render_mobile_viewer() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        $current_device_config = $this->device_presets[$this->current_device];
        $current_url = home_url($_SERVER['REQUEST_URI']);
        ?>
        
        <!-- Panel del Visor Móvil -->
        <div id="cm-mobile-viewer" class="cm-mobile-viewer" style="display: none;">
            <div class="cm-mobile-header">
                <div class="cm-mobile-title">
                    <span class="cm-mobile-icon">📱</span>
                    <h3>Mobile Viewer</h3>
                    <span class="cm-device-name"><?php echo esc_html($current_device_config['name']); ?></span>
                </div>
                
                <div class="cm-mobile-controls">
                    <!-- Selector de dispositivos -->
                    <div class="cm-device-selector">
                        <button class="cm-dropdown-btn" id="cm-device-dropdown-btn">
                            <span class="cm-current-device">
                                <?php echo $current_device_config['icon']; ?>
                                <?php echo esc_html($current_device_config['name']); ?>
                            </span>
                            <span class="cm-dropdown-arrow">▼</span>
                        </button>
                        
                        <div class="cm-dropdown-menu" id="cm-device-dropdown">
                            <?php foreach ($this->device_presets as $device_id => $device): ?>
                                <?php if ($device_id === 'custom') continue; ?>
                                <div class="cm-dropdown-item <?php echo $device_id === $this->current_device ? 'active' : ''; ?>" 
                                     data-device="<?php echo esc_attr($device_id); ?>">
                                    <span class="cm-device-icon"><?php echo $device['icon']; ?></span>
                                    <div class="cm-device-info">
                                        <div class="cm-device-name"><?php echo esc_html($device['name']); ?></div>
                                        <div class="cm-device-size"><?php echo $device['width']; ?>×<?php echo $device['height']; ?></div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                    
                    <!-- Controles de orientación -->
                    <div class="cm-orientation-controls">
                        <button class="cm-orientation-btn <?php echo $this->orientation === 'portrait' ? 'active' : ''; ?>" 
                                data-orientation="portrait" title="Portrait">
                            <span>📱</span>
                        </button>
                        <button class="cm-orientation-btn <?php echo $this->orientation === 'landscape' ? 'active' : ''; ?>" 
                                data-orientation="landscape" title="Landscape">
                            <span>📱</span>
                        </button>
                    </div>
                    
                    <!-- Controles de zoom -->
                    <div class="cm-zoom-controls">
                        <button class="cm-zoom-btn" data-zoom="0.5" title="50%">50%</button>
                        <button class="cm-zoom-btn" data-zoom="0.75" title="75%">75%</button>
                        <button class="cm-zoom-btn active" data-zoom="1" title="100%">100%</button>
                        <button class="cm-zoom-btn" data-zoom="1.25" title="125%">125%</button>
                    </div>
                    
                    <!-- Acciones simples -->
                    <div class="cm-mobile-actions">
                        <button class="cm-action-btn" id="cm-reload-frame-btn" title="Reload">
                            <span>🔄</span>
                        </button>
                        <button class="cm-action-btn" id="cm-close-mobile-btn" title="Close">
                            <span>✕</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="cm-mobile-content">
                <div class="cm-mobile-frame-container">
                    <!-- Frame del dispositivo -->
                    <div class="cm-device-frame cm-orientation-<?php echo $this->orientation; ?>" 
                         data-device="<?php echo esc_attr($this->current_device); ?>">
                        
                        <!-- Viewport -->
                        <div class="cm-device-viewport" 
                             style="width: <?php echo $current_device_config['width']; ?>px; 
                                    height: <?php echo $current_device_config['height']; ?>px;
                                    transform: scale(<?php echo $this->zoom_level; ?>);">
                            
                            <iframe id="cm-mobile-iframe" 
                                    src="<?php echo esc_url($current_url); ?>"
                                    width="<?php echo $current_device_config['width']; ?>"
                                    height="<?php echo $current_device_config['height']; ?>"
                                    frameborder="0"
                                    scrolling="yes">
                            </iframe>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Inicializar mobile viewer cuando esté listo
            if (typeof ConsoleMonitorMobileViewer !== 'undefined') {
                ConsoleMonitorMobileViewer.init({
                    ajaxUrl: '<?php echo admin_url('admin-ajax.php'); ?>',
                    nonce: '<?php echo wp_create_nonce('console_monitor_nonce'); ?>',
                    currentDevice: '<?php echo esc_js($this->current_device); ?>',
                    currentOrientation: '<?php echo esc_js($this->orientation); ?>',
                    currentZoom: <?php echo $this->zoom_level; ?>,
                    devicePresets: <?php echo json_encode($this->device_presets); ?>,
                    currentUrl: '<?php echo esc_js($current_url); ?>'
                });
            }
        });
        </script>
        
        <?php
    }
    
    /**
     * AJAX: Toggle del visor móvil
     */
    public function ajax_toggle_viewer() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $this->is_active = !$this->is_active;
        
        wp_send_json_success(array(
            'is_active' => $this->is_active,
            'message' => $this->is_active ? 'Mobile Viewer abierto' : 'Mobile Viewer cerrado'
        ));
    }
    
    /**
     * AJAX: Cambiar dispositivo
     */
    public function ajax_change_device() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $device = sanitize_text_field($_POST['device']);
        
        if (!isset($this->device_presets[$device])) {
            wp_send_json_error('Dispositivo no válido');
        }
        
        $this->current_device = $device;
        
        // Si es custom, usar dimensiones personalizadas
        if ($device === 'custom') {
            $width = intval($_POST['width'] ?? $this->custom_dimensions['width']);
            $height = intval($_POST['height'] ?? $this->custom_dimensions['height']);
            
            $this->custom_dimensions = array(
                'width' => max(320, min(1920, $width)),
                'height' => max(480, min(1080, $height))
            );
            
            $this->device_presets['custom']['width'] = $this->custom_dimensions['width'];
            $this->device_presets['custom']['height'] = $this->custom_dimensions['height'];
        }
        
        wp_send_json_success(array(
            'device' => $device,
            'config' => $this->device_presets[$device],
            'message' => 'Dispositivo cambiado a ' . $this->device_presets[$device]['name']
        ));
    }
    
    /**
     * AJAX: Cambiar orientación
     */
    public function ajax_change_orientation() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $orientation = sanitize_text_field($_POST['orientation']);
        
        if (!in_array($orientation, array('portrait', 'landscape'))) {
            wp_send_json_error('Orientación no válida');
        }
        
        $this->orientation = $orientation;
        
        wp_send_json_success(array(
            'orientation' => $orientation,
            'message' => 'Orientación cambiada a ' . $orientation
        ));
    }
    
    /**
     * AJAX: Cambiar zoom
     */
    public function ajax_change_zoom() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $zoom = floatval($_POST['zoom']);
        $zoom = max(0.25, min(2.0, $zoom)); // Limitar entre 25% y 200%
        
        $this->zoom_level = $zoom;
        
        wp_send_json_success(array(
            'zoom' => $zoom,
            'message' => 'Zoom cambiado a ' . ($zoom * 100) . '%'
        ));
    }
    
    /**
     * AJAX: Recargar frame
     */
    public function ajax_reload_frame() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        wp_send_json_success(array(
            'message' => 'Frame recargado',
            'timestamp' => current_time('timestamp')
        ));
    }
    
    /**
     * AJAX: Tomar screenshot (simulado)
     */
    public function ajax_take_screenshot() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        // En una implementación real, aquí generarías un screenshot
        // Para esta versión, solo simulamos la funcionalidad
        
        wp_send_json_success(array(
            'message' => 'Screenshot capturado',
            'filename' => 'screenshot_' . date('Y-m-d_H-i-s') . '.png',
            'device' => $this->device_presets[$this->current_device]['name']
        ));
    }
    
    /**
     * Métodos públicos para acceso externo
     */
    public function show() {
        $this->is_active = true;
    }
    
    public function hide() {
        $this->is_active = false;
    }
    
    public function is_active() {
        return $this->is_active;
    }
    
    public function get_current_device() {
        return $this->current_device;
    }
    
    public function get_device_presets() {
        return $this->device_presets;
    }
    
    public function get_current_dimensions() {
        if ($this->current_device === 'custom') {
            return $this->custom_dimensions;
        }
        
        $device = $this->device_presets[$this->current_device];
        return array(
            'width' => $device['width'],
            'height' => $device['height']
        );
    }
}
?>