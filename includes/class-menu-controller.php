<?php
/**
 * Clase controladora del menú flotante
 * Gestiona la comunicación entre todos los componentes
 * 
 * @package ConsoleMonitorPro
 * @since 2.0
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

class Console_Monitor_Menu_Controller {
    
    private $floating_menu = null;
    private $console_monitor = null;
    private $mobile_viewer = null;
    private $active_tools = array();
    private $menu_state = 'closed';
    private $last_action = null;
    
    /**
     * Constructor
     */
    public function __construct() {
        // Inicializar estado por defecto
        $this->active_tools = array(
            'console' => false,
            'mobile' => false,
            'settings' => false
        );
    }
    
    /**
     * Inicializar el controlador
     */
    public function init() {
        // Solo para administradores
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Hooks de WordPress
        add_action('wp_footer', array($this, 'render_controller_scripts'), 999);
        add_action('admin_footer', array($this, 'render_controller_scripts'), 999);
        
        // AJAX handlers principales
        add_action('wp_ajax_cm_menu_action', array($this, 'ajax_handle_menu_action'));
        add_action('wp_ajax_cm_get_state', array($this, 'ajax_get_global_state'));
        add_action('wp_ajax_cm_sync_tools', array($this, 'ajax_sync_tools'));
        add_action('wp_ajax_cm_keyboard_shortcut', array($this, 'ajax_handle_keyboard_shortcut'));
        
        // Hook para interceptar todas las acciones del menú
        add_action('wp_ajax_cm_route_action', array($this, 'ajax_route_action'));
    }
    
    /**
     * Establecer referencia al menú flotante
     */
    public function set_floating_menu($floating_menu) {
        $this->floating_menu = $floating_menu;
    }
    
    /**
     * Establecer referencia al console monitor
     */
    public function set_console_monitor($console_monitor) {
        $this->console_monitor = $console_monitor;
    }
    
    /**
     * Establecer referencia al mobile viewer
     */
    public function set_mobile_viewer($mobile_viewer) {
        $this->mobile_viewer = $mobile_viewer;
    }
    
    /**
     * Renderizar scripts del controlador
     */
    public function render_controller_scripts() {
        if (!current_user_can('manage_options')) {
            return;
        }
        ?>
        
        <script type="text/javascript">
        // Console Monitor Pro - Controller
        window.ConsoleMonitorController = {
            
            // Estado global
            state: {
                menuOpen: false,
                activeTools: <?php echo json_encode($this->active_tools); ?>,
                lastAction: null,
                shortcuts: {
                    'ctrl+shift+c': 'toggle_console',
                    'ctrl+shift+m': 'toggle_mobile',
                    'ctrl+shift+f': 'toggle_menu'
                }
            },
            
            // Inicializar controlador
            init: function() {
                this.bindEvents();
                this.setupKeyboardShortcuts();
                this.syncWithServer();
                this.startHeartbeat();
                
                console.log('Console Monitor Controller initialized');
            },
            
            // Vincular eventos
            bindEvents: function() {
                var self = this;
                
                // Evento del botón flotante principal
                jQuery(document).on('click', '#cm-floating-button', function(e) {
                    e.preventDefault();
                    self.toggleMenu();
                });
                
                // Eventos de elementos del menú
                jQuery(document).on('click', '.cm-menu-item', function(e) {
                    e.preventDefault();
                    var action = jQuery(this).data('action');
                    var itemId = jQuery(this).data('item-id');
                    self.handleMenuAction(action, itemId);
                });
                
                // Eventos de acciones rápidas
                jQuery(document).on('click', '.cm-quick-btn', function(e) {
                    e.preventDefault();
                    var action = jQuery(this).data('action');
                    self.handleQuickAction(action);
                });
                
                // Overlay para cerrar menú
                jQuery(document).on('click', '#cm-menu-overlay', function(e) {
                    self.closeMenu();
                });
                
                // Escape para cerrar
                jQuery(document).on('keyup', function(e) {
                    if (e.keyCode === 27 && self.state.menuOpen) {
                        self.closeMenu();
                    }
                });
                
                // Eventos de herramientas individuales
                this.bindToolEvents();
            },
            
            // Vincular eventos de herramientas específicas
            bindToolEvents: function() {
                var self = this;
                
                // Console Monitor events
                jQuery(document).on('click', '#cm-close-console-btn', function() {
                    self.closeTool('console');
                });
                
                // Mobile Viewer events
                jQuery(document).on('click', '#cm-close-mobile-btn', function() {
                    self.closeTool('mobile');
                });
                
                // Sync cuando las herramientas cambian estado internamente
                jQuery(document).on('consoleMonitorStateChange', function(e, data) {
                    self.state.activeTools.console = data.isVisible;
                    self.updateUI();
                });
                
                jQuery(document).on('mobileViewerStateChange', function(e, data) {
                    self.state.activeTools.mobile = data.isActive;
                    self.updateUI();
                });
            },
            
            // Configurar atajos de teclado
            setupKeyboardShortcuts: function() {
                var self = this;
                
                jQuery(document).on('keydown', function(e) {
                    var key = '';
                    
                    if (e.ctrlKey) key += 'ctrl+';
                    if (e.shiftKey) key += 'shift+';
                    if (e.altKey) key += 'alt+';
                    
                    key += e.key.toLowerCase();
                    
                    if (self.state.shortcuts[key]) {
                        e.preventDefault();
                        self.handleKeyboardShortcut(self.state.shortcuts[key]);
                    }
                });
            },
            
            // Toggle del menú principal
            toggleMenu: function() {
                if (this.state.menuOpen) {
                    this.closeMenu();
                } else {
                    this.openMenu();
                }
            },
            
            // Abrir menú
            openMenu: function() {
                this.state.menuOpen = true;
                
                jQuery('#cm-floating-button').addClass('active');
                jQuery('#cm-floating-menu').addClass('open').show();
                jQuery('#cm-menu-overlay').show();
                
                // Animar entrada
                jQuery('#cm-floating-menu').css({
                    opacity: 0,
                    transform: 'scale(0.8) translateY(20px)'
                }).animate({
                    opacity: 1
                }, {
                    duration: 200,
                    step: function(now) {
                        var scale = 0.8 + (0.2 * now);
                        var translateY = 20 - (20 * now);
                        jQuery(this).css('transform', 'scale(' + scale + ') translateY(' + translateY + 'px)');
                    }
                });
                
                this.updateMenuItems();
                this.logAction('menu_opened');
            },
            
            // Cerrar menú
            closeMenu: function() {
                var self = this;
                this.state.menuOpen = false;
                
                jQuery('#cm-floating-button').removeClass('active');
                
                // Animar salida
                jQuery('#cm-floating-menu').animate({
                    opacity: 0
                }, {
                    duration: 150,
                    step: function(now) {
                        var scale = 0.8 + (0.2 * now);
                        var translateY = 20 - (20 * now);
                        jQuery(this).css('transform', 'scale(' + scale + ') translateY(' + translateY + 'px)');
                    },
                    complete: function() {
                        jQuery('#cm-floating-menu').removeClass('open').hide();
                        jQuery('#cm-menu-overlay').hide();
                    }
                });
                
                this.logAction('menu_closed');
            },
            
            // Manejar acciones del menú
            handleMenuAction: function(action, itemId) {
                this.logAction('menu_action', { action: action, itemId: itemId });
                
                switch(action) {
                    case 'open_console':
                        this.toggleTool('console');
                        break;
                    case 'open_mobile_viewer':
                        this.toggleTool('mobile');
                        break;
                    case 'open_settings':
                        this.toggleTool('settings');
                        break;
                    default:
                        console.warn('Unknown menu action:', action);
                }
                
                // Cerrar menú después de la acción
                this.closeMenu();
            },
            
            // Manejar acciones rápidas
            handleQuickAction: function(action) {
                this.logAction('quick_action', { action: action });
                
                switch(action) {
                    case 'minimize_all':
                        this.minimizeAllTools();
                        break;
                    case 'refresh_tools':
                        this.refreshAllTools();
                        break;
                    case 'toggle_position':
                        this.toggleMenuPosition();
                        break;
                    default:
                        console.warn('Unknown quick action:', action);
                }
            },
            
            // Toggle de herramientas
            toggleTool: function(toolName) {
                if (this.state.activeTools[toolName]) {
                    this.closeTool(toolName);
                } else {
                    this.openTool(toolName);
                }
            },
            
            // Abrir herramienta específica
            openTool: function(toolName) {
                this.state.activeTools[toolName] = true;
                
                switch(toolName) {
                    case 'console':
                        jQuery('#cm-console-panel').show().addClass('active');
                        if (window.ConsoleMonitorConsole) {
                            ConsoleMonitorConsole.show();
                        }
                        break;
                    case 'mobile':
                        jQuery('#cm-mobile-viewer').show().addClass('active');
                        if (window.ConsoleMonitorMobileViewer) {
                            ConsoleMonitorMobileViewer.show();
                        }
                        break;
                    case 'settings':
                        this.openSettingsPanel();
                        break;
                }
                
                this.updateUI();
                this.syncWithServer();
                this.logAction('tool_opened', { tool: toolName });
            },
            
            // Cerrar herramienta específica
            closeTool: function(toolName) {
                this.state.activeTools[toolName] = false;
                
                switch(toolName) {
                    case 'console':
                        jQuery('#cm-console-panel').removeClass('active').fadeOut(200);
                        if (window.ConsoleMonitorConsole) {
                            ConsoleMonitorConsole.hide();
                        }
                        break;
                    case 'mobile':
                        jQuery('#cm-mobile-viewer').removeClass('active').fadeOut(200);
                        if (window.ConsoleMonitorMobileViewer) {
                            ConsoleMonitorMobileViewer.hide();
                        }
                        break;
                    case 'settings':
                        this.closeSettingsPanel();
                        break;
                }
                
                this.updateUI();
                this.syncWithServer();
                this.logAction('tool_closed', { tool: toolName });
            },
            
            // Minimizar todas las herramientas
            minimizeAllTools: function() {
                var hasActiveTools = false;
                
                for (var tool in this.state.activeTools) {
                    if (this.state.activeTools[tool]) {
                        this.minimizeTool(tool);
                        hasActiveTools = true;
                    }
                }
                
                if (!hasActiveTools) {
                    this.showNotification('No hay herramientas abiertas para minimizar', 'info');
                } else {
                    this.showNotification('Todas las herramientas minimizadas', 'success');
                }
            },
            
            // Minimizar herramienta específica
            minimizeTool: function(toolName) {
                var element = null;
                
                switch(toolName) {
                    case 'console':
                        element = jQuery('#cm-console-panel');
                        break;
                    case 'mobile':
                        element = jQuery('#cm-mobile-viewer');
                        break;
                }
                
                if (element && element.length) {
                    element.addClass('minimized');
                }
            },
            
            // Refrescar todas las herramientas
            refreshAllTools: function() {
                if (this.state.activeTools.console && window.ConsoleMonitorConsole) {
                    ConsoleMonitorConsole.refresh();
                }
                
                if (this.state.activeTools.mobile && window.ConsoleMonitorMobileViewer) {
                    ConsoleMonitorMobileViewer.refresh();
                }
                
                this.showNotification('Herramientas refrescadas', 'success');
            },
            
            // Cambiar posición del menú
            toggleMenuPosition: function() {
                var currentPos = jQuery('#cm-floating-button').attr('class').match(/cm-position-(\S+)/);
                if (currentPos) {
                    var positions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
                    var currentIndex = positions.indexOf(currentPos[1]);
                    var nextIndex = (currentIndex + 1) % positions.length;
                    var newPosition = positions[nextIndex];
                    
                    // Actualizar posición vía AJAX
                    this.updateMenuPosition(newPosition);
                }
            },
            
            // Actualizar posición del menú
            updateMenuPosition: function(position) {
                var self = this;
                
                jQuery.post(ajaxurl, {
                    action: 'update_menu_position',
                    position: position,
                    nonce: consoleMonitorData.nonce
                }, function(response) {
                    if (response.success) {
                        // Actualizar clases CSS
                        jQuery('#cm-floating-button, #cm-floating-menu')
                            .removeClass('cm-position-top-left cm-position-top-right cm-position-bottom-left cm-position-bottom-right')
                            .addClass('cm-position-' + position);
                        
                        self.showNotification('Posición cambiada a ' + position.replace('-', ' '), 'success');
                    }
                });
            },
            
            // Abrir panel de configuración
            openSettingsPanel: function() {
                // TODO: Implementar panel de configuración
                this.showNotification('Panel de configuración (próximamente)', 'info');
            },
            
            // Cerrar panel de configuración
            closeSettingsPanel: function() {
                // TODO: Implementar cierre del panel
            },
            
            // Manejar atajos de teclado
            handleKeyboardShortcut: function(action) {
                this.logAction('keyboard_shortcut', { action: action });
                
                switch(action) {
                    case 'toggle_console':
                        this.toggleTool('console');
                        break;
                    case 'toggle_mobile':
                        this.toggleTool('mobile');
                        break;
                    case 'toggle_menu':
                        this.toggleMenu();
                        break;
                }
            },
            
            // Actualizar elementos del menú
            updateMenuItems: function() {
                var self = this;
                
                jQuery('.cm-menu-item').each(function() {
                    var itemId = jQuery(this).data('item-id');
                    var isActive = false;
                    
                    if (itemId === 'console-monitor') {
                        isActive = self.state.activeTools.console;
                    } else if (itemId === 'mobile-viewer') {
                        isActive = self.state.activeTools.mobile;
                    } else if (itemId === 'menu-settings') {
                        isActive = self.state.activeTools.settings;
                    }
                    
                    jQuery(this).toggleClass('active', isActive);
                });
            },
            
            // Actualizar UI global
            updateUI: function() {
                // Actualizar indicador de estado
                var activeCount = Object.values(this.state.activeTools).filter(Boolean).length;
                var statusDot = jQuery('.cm-status-dot');
                
                if (activeCount > 0) {
                    statusDot.removeClass('cm-status-inactive').addClass('cm-status-active');
                    statusDot.attr('title', activeCount + ' herramienta(s) activa(s)');
                } else {
                    statusDot.removeClass('cm-status-active').addClass('cm-status-inactive');
                    statusDot.attr('title', 'Sin herramientas activas');
                }
                
                // Actualizar botón flotante
                jQuery('#cm-floating-button').toggleClass('has-active-tools', activeCount > 0);
            },
            
            // Sincronizar con el servidor
            syncWithServer: function() {
                jQuery.post(ajaxurl, {
                    action: 'cm_sync_tools',
                    state: JSON.stringify(this.state),
                    nonce: consoleMonitorData.nonce
                });
            },
            
            // Obtener estado desde el servidor
            getStateFromServer: function() {
                var self = this;
                
                jQuery.post(ajaxurl, {
                    action: 'cm_get_state',
                    nonce: consoleMonitorData.nonce
                }, function(response) {
                    if (response.success) {
                        self.state = jQuery.extend(self.state, response.data);
                        self.updateUI();
                    }
                });
            },
            
            // Heartbeat para mantener sincronización
            startHeartbeat: function() {
                var self = this;
                
                setInterval(function() {
                    self.getStateFromServer();
                }, 30000); // Cada 30 segundos
            },
            
            // Mostrar notificación
            showNotification: function(message, type) {
                type = type || 'info';
                
                var notification = jQuery('<div class="cm-notification cm-notification-' + type + '">' + message + '</div>');
                jQuery('body').append(notification);
                
                notification.fadeIn(200).delay(3000).fadeOut(200, function() {
                    jQuery(this).remove();
                });
            },
            
            // Log de acciones para debugging
            logAction: function(action, data) {
                this.state.lastAction = {
                    action: action,
                    data: data || {},
                    timestamp: new Date().toISOString()
                };
                
                if (window.console && console.log) {
                    console.log('[CM Controller]', action, data);
                }
            }
        };
        
        // Auto-inicializar cuando jQuery esté listo
        jQuery(document).ready(function() {
            ConsoleMonitorController.init();
        });
        </script>
        
        <style>
        /* Estilos para notificaciones */
        .cm-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 100000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: none;
        }
        
        .cm-notification-success {
            background-color: #46b450;
        }
        
        .cm-notification-error {
            background-color: #dc3232;
        }
        
        .cm-notification-warning {
            background-color: #ffb900;
            color: #333;
        }
        
        .cm-notification-info {
            background-color: #00a0d2;
        }
        
        /* Estado activo del botón flotante */
        #cm-floating-button.has-active-tools .cm-btn-pulse {
            animation: cm-pulse 2s infinite;
        }
        
        @keyframes cm-pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }
        
        /* Estado activo de elementos del menú */
        .cm-menu-item.active {
            background-color: rgba(255,255,255,0.1);
            border-left: 3px solid #00a0d2;
        }
        
        .cm-menu-item.active .cm-item-arrow {
            color: #00a0d2;
        }
        </style>
        
        <?php
    }
    
    /**
     * AJAX: Manejar acción del menú
     */
    public function ajax_handle_menu_action() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $action = sanitize_text_field($_POST['action_type']);
        $data = $_POST['data'] ? json_decode(stripslashes($_POST['data']), true) : array();
        
        $this->last_action = array(
            'action' => $action,
            'data' => $data,
            'timestamp' => current_time('timestamp')
        );
        
        // Log de acción
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[Console Monitor] Menu action: ' . $action . ' - ' . print_r($data, true));
        }
        
        wp_send_json_success(array(
            'message' => 'Acción procesada: ' . $action,
            'timestamp' => current_time('timestamp')
        ));
    }
    
    /**
     * AJAX: Obtener estado global
     */
    public function ajax_get_global_state() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $state = array(
            'active_tools' => $this->active_tools,
            'menu_state' => $this->menu_state,
            'last_action' => $this->last_action,
            'components' => array(
                'floating_menu' => $this->floating_menu ? true : false,
                'console_monitor' => $this->console_monitor ? true : false,
                'mobile_viewer' => $this->mobile_viewer ? true : false
            ),
            'settings' => get_option('console_monitor_settings', array())
        );
        
        wp_send_json_success($state);
    }
    
    /**
     * AJAX: Sincronizar herramientas
     */
    public function ajax_sync_tools() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $client_state = json_decode(stripslashes($_POST['state']), true);
        
        if ($client_state && isset($client_state['activeTools'])) {
            $this->active_tools = $client_state['activeTools'];
            $this->menu_state = $client_state['menuOpen'] ? 'open' : 'closed';
            
            // Sincronizar con componentes individuales
            if ($this->console_monitor) {
                if ($this->active_tools['console']) {
                    $this->console_monitor->show();
                } else {
                    $this->console_monitor->hide();
                }
            }
            
            if ($this->mobile_viewer) {
                if ($this->active_tools['mobile']) {
                    $this->mobile_viewer->show();
                } else {
                    $this->mobile_viewer->hide();
                }
            }
        }
        
        wp_send_json_success(array(
            'synced' => true,
            'server_state' => array(
                'active_tools' => $this->active_tools,
                'menu_state' => $this->menu_state
            )
        ));
    }
    
    /**
     * AJAX: Manejar atajo de teclado
     */
    public function ajax_handle_keyboard_shortcut() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $shortcut = sanitize_text_field($_POST['shortcut']);
        
        $this->last_action = array(
            'action' => 'keyboard_shortcut',
            'data' => array('shortcut' => $shortcut),
            'timestamp' => current_time('timestamp')
        );
        
        wp_send_json_success(array(
            'shortcut' => $shortcut,
            'message' => 'Atajo de teclado procesado'
        ));
    }
    
    /**
     * AJAX: Enrutar acción a componente específico
     */
    public function ajax_route_action() {
        if (!wp_verify_nonce($_POST['nonce'], 'console_monitor_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $component = sanitize_text_field($_POST['component']);
        $action = sanitize_text_field($_POST['action_name']);
        $data = $_POST['data'] ? json_decode(stripslashes($_POST['data']), true) : array();
        
        $result = null;
        
        switch ($component) {
            case 'console':
                if ($this->console_monitor && method_exists($this->console_monitor, $action)) {
                    $result = call_user_func_array(array($this->console_monitor, $action), array($data));
                }
                break;
            case 'mobile':
                if ($this->mobile_viewer && method_exists($this->mobile_viewer, $action)) {
                    $result = call_user_func_array(array($this->mobile_viewer, $action), array($data));
                }
                break;
            case 'menu':
                if ($this->floating_menu && method_exists($this->floating_menu, $action)) {
                    $result = call_user_func_array(array($this->floating_menu, $action), array($data));
                }
                break;
        }
        
        wp_send_json_success(array(
            'component' => $component,
            'action' => $action,
            'result' => $result
        ));
    }
    
    /**
     * Obtener estado de herramientas activas
     */
    public function get_active_tools() {
        return $this->active_tools;
    }
    
    /**
     * Establecer herramienta como activa/inactiva
     */
    public function set_tool_active($tool, $active) {
        if (isset($this->active_tools[$tool])) {
            $this->active_tools[$tool] = (bool) $active;
        }
    }
    
    /**
     * Verificar si una herramienta está activa
     */
    public function is_tool_active($tool) {
        return isset($this->active_tools[$tool]) ? $this->active_tools[$tool] : false;
    }
    
    /**
     * Obtener estado del menú
     */
    public function get_menu_state() {
        return $this->menu_state;
    }
    
    /**
     * Obtener última acción realizada
     */
    public function get_last_action() {
        return $this->last_action;
    }
    
    /**
     * Reset completo del estado
     */
    public function reset_state() {
        $this->active_tools = array(
            'console' => false,
            'mobile' => false,
            'settings' => false
        );
        $this->menu_state = 'closed';
        $this->last_action = null;
    }
}
?>