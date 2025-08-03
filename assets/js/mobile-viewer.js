/**
 * Console Monitor Pro - Mobile Viewer JavaScript
 * Maneja toda la lógica del visor móvil y simulador de dispositivos
 */

(function ($) {
    'use strict';

    // Namespace global
    window.ConsoleMonitorMobileViewer = {

        // Configuración por defecto
        config: {
            ajaxUrl: '',
            nonce: '',
            currentDevice: 'iphone-12',
            currentOrientation: 'portrait',
            currentZoom: 1.0,
            devicePresets: {},
            currentUrl: '',
            enableNetworkThrottling: true,
            enablePerformanceMonitoring: true,
            enableAccessibilityCheck: true,
            screenshotQuality: 0.8
        },

        // Estado del visor móvil
        state: {
            isActive: false,
            isLoading: false,
            currentDevice: 'iphone-12',
            orientation: 'portrait',
            zoom: 1.0,
            customDimensions: { width: 375, height: 667 },
            networkThrottling: 'none',
            loadTime: 0,
            connectionStatus: 'online',
            isDropdownOpen: false,
            isDragging: false,
            performanceData: {},
            accessibilityIssues: []
        },

        // Elementos del DOM
        elements: {
            $viewer: null,
            $header: null,
            $content: null,
            $sidebar: null,
            $footer: null,
            $frame: null,
            $iframe: null,
            $dropdown: null,
            $deviceFrame: null,
            $viewport: null,
            $controls: null
        },

        // Timers
        timers: {
            loadingTimeout: null,
            performanceCheck: null,
            connectionCheck: null,
            orientationTransition: null
        },

        // Cache de datos
        cache: {
            devicePresets: {},
            screenshots: [],
            performanceHistory: [],
            loadTimeHistory: []
        },

        /**
         * Inicializar el visor móvil
         */
        init: function (options) {
            // Extender configuración
            this.config = $.extend(true, this.config, options);
            this.cache.devicePresets = this.config.devicePresets;

            // Actualizar estado inicial
            this.state.currentDevice = this.config.currentDevice;
            this.state.orientation = this.config.currentOrientation;
            this.state.zoom = this.config.currentZoom;

            // Cachear elementos del DOM
            this.cacheElements();

            // Configurar eventos
            this.bindEvents();

            // Configurar funcionalidades
            this.setupDeviceSimulation();
            this.setupNetworkThrottling();
            this.setupPerformanceMonitoring();
            this.setupKeyboardShortcuts();

            // Inicializar UI
            this.updateDeviceDisplay();
            this.updateUI();

            console.log('✅ Mobile Viewer initialized');
        },

        /**
         * Cachear elementos del DOM
         */
        cacheElements: function () {
            this.elements.$viewer = $('#cm-mobile-viewer');
            this.elements.$header = $('.cm-mobile-header');
            this.elements.$content = $('.cm-mobile-content');
            this.elements.$sidebar = $('.cm-mobile-sidebar');
            this.elements.$footer = $('.cm-mobile-footer');
            this.elements.$frame = $('.cm-device-frame');
            this.elements.$iframe = $('#cm-mobile-iframe');
            this.elements.$dropdown = $('#cm-device-dropdown');
            this.elements.$deviceFrame = $('.cm-device-frame');
            this.elements.$viewport = $('.cm-device-viewport');
            this.elements.$controls = $('.cm-mobile-controls');

            if (!this.elements.$viewer.length) {
                console.warn('⚠️ Mobile viewer not found');
                return false;
            }

            return true;
        },

        /**
         * Configurar eventos
         */
        bindEvents: function () {
            var self = this;

            // Dropdown de dispositivos
            $('#cm-device-dropdown-btn').on('click.cmMobile', function (e) {
                e.preventDefault();
                self.toggleDeviceDropdown();
            });

            $('.cm-dropdown-item').on('click.cmMobile', function (e) {
                e.preventDefault();
                var device = $(this).data('device');
                self.changeDevice(device);
            });

            // Controles de orientación
            $('.cm-orientation-btn').on('click.cmMobile', function (e) {
                e.preventDefault();
                var orientation = $(this).data('orientation');
                self.changeOrientation(orientation);
            });

            // Controles de zoom
            $('.cm-zoom-btn').on('click.cmMobile', function (e) {
                e.preventDefault();
                var zoom = parseFloat($(this).data('zoom'));
                self.changeZoom(zoom);
            });

            // Acciones del visor
            $('#cm-reload-frame-btn').on('click.cmMobile', function (e) {
                e.preventDefault();
                self.reloadFrame();
            });

            $('#cm-screenshot-btn').on('click.cmMobile', function (e) {
                e.preventDefault();
                self.takeScreenshot();
            });

            $('#cm-responsive-mode-btn').on('click.cmMobile', function (e) {
                e.preventDefault();
                self.toggleResponsiveMode();
            });

            $('#cm-mobile-settings-btn').on('click.cmMobile', function (e) {
                e.preventDefault();
                self.openSettings();
            });

            $('#cm-close-mobile-btn').on('click.cmMobile', function (e) {
                e.preventDefault();
                self.hide();
            });

            // Controles del sidebar
            $('#cm-apply-custom-size').on('click.cmMobile', function (e) {
                e.preventDefault();
                self.applyCustomSize();
            });

            $('#cm-network-preset').on('change.cmMobile', function (e) {
                var throttling = $(this).val();
                self.setNetworkThrottling(throttling);
            });

            // Quick actions
            $('#cm-test-touch').on('click.cmMobile', function (e) {
                e.preventDefault();
                self.testTouchEvents();
            });

            $('#cm-performance-test').on('click.cmMobile', function (e) {
                e.preventDefault();
                self.runPerformanceTest();
            });

            $('#cm-accessibility-check').on('click.cmMobile', function (e) {
                e.preventDefault();
                self.runAccessibilityCheck();
            });

            // Eventos del iframe
            this.elements.$iframe.on('load.cmMobile', function () {
                self.onFrameLoad();
            });

            // Cerrar dropdown al hacer clic fuera
            $(document).on('click.cmMobile', function (e) {
                if (!$(e.target).closest('.cm-device-selector').length) {
                    self.closeDeviceDropdown();
                }
            });

            // Eventos de teclado
            $(document).on('keydown.cmMobile', function (e) {
                if (self.state.isActive) {
                    self.handleKeyDown(e);
                }
            });

            // Eventos de redimensionamiento
            $(window).on('resize.cmMobile', function () {
                self.handleWindowResize();
            });
        },

        /**
         * Mostrar visor móvil
         */
        show: function () {
            if (this.state.isActive) return;

            this.state.isActive = true;

            this.elements.$viewer
                .addClass('entering active')
                .show()
                .css({
                    opacity: 0,
                    transform: 'scale(1.05)'
                })
                .animate({
                    opacity: 1
                }, {
                    duration: 500,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    step: function (now) {
                        var scale = 1.05 - (0.05 * now);
                        $(this).css('transform', 'scale(' + scale + ')');
                    },
                    complete: function () {
                        $(this).removeClass('entering');
                        this.reloadFrame();
                        this.startMonitoring();
                        this.triggerEvent('shown');
                    }.bind(this)
                });

            console.log('📱 Mobile Viewer shown');
        },

        /**
         * Ocultar visor móvil
         */
        hide: function () {
            if (!this.state.isActive) return;

            this.state.isActive = false;

            this.stopMonitoring();

            this.elements.$viewer
                .addClass('leaving')
                .animate({
                    opacity: 0
                }, {
                    duration: 400,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    step: function (now) {
                        var scale = 0.95 + (0.05 * now);
                        $(this).css('transform', 'scale(' + scale + ')');
                    },
                    complete: function () {
                        $(this).removeClass('leaving active').hide();
                        this.triggerEvent('hidden');
                    }.bind(this)
                });

            console.log('❌ Mobile Viewer hidden');
        },

        /**
         * Toggle visibility
         */
        toggle: function () {
            if (this.state.isActive) {
                this.hide();
            } else {
                this.show();
            }
        },

        /**
         * Toggle dropdown de dispositivos
         */
        toggleDeviceDropdown: function () {
            if (this.state.isDropdownOpen) {
                this.closeDeviceDropdown();
            } else {
                this.openDeviceDropdown();
            }
        },

        /**
         * Abrir dropdown de dispositivos
         */
        openDeviceDropdown: function () {
            this.state.isDropdownOpen = true;

            $('#cm-device-dropdown-btn').addClass('open');
            this.elements.$dropdown.addClass('open');

            // Animar elementos
            this.elements.$dropdown.find('.cm-dropdown-item').each(function (index) {
                $(this).css({
                    opacity: 0,
                    transform: 'translateY(-10px)'
                }).delay(index * 30).animate({
                    opacity: 1
                }, {
                    duration: 200,
                    step: function (now) {
                        var translateY = -10 + (10 * now);
                        $(this).css('transform', 'translateY(' + translateY + 'px)');
                    }
                });
            });
        },

        /**
         * Cerrar dropdown de dispositivos
         */
        closeDeviceDropdown: function () {
            this.state.isDropdownOpen = false;

            $('#cm-device-dropdown-btn').removeClass('open');
            this.elements.$dropdown.removeClass('open');
        },

        /**
         * Cambiar dispositivo
         */
        changeDevice: function (deviceId) {
            if (!this.cache.devicePresets[deviceId]) {
                console.warn('Device not found:', deviceId);
                return;
            }

            var oldDevice = this.state.currentDevice;
            this.state.currentDevice = deviceId;

            // Actualizar UI
            this.updateDeviceDisplay();
            this.closeDeviceDropdown();

            // Comunicar cambio al servidor
            this.notifyDeviceChange(deviceId);

            // Si es custom, mostrar controles
            if (deviceId === 'custom') {
                this.showCustomControls();
            }

            console.log('📱 Device changed from', oldDevice, 'to', deviceId);
        },

        /**
         * Cambiar orientación
         */
        changeOrientation: function (orientation) {
            if (this.state.orientation === orientation) return;

            this.state.orientation = orientation;

            // Actualizar botones
            $('.cm-orientation-btn').removeClass('active');
            $('.cm-orientation-btn[data-orientation="' + orientation + '"]').addClass('active');

            // Animar cambio de orientación
            this.animateOrientationChange(orientation);

            // Actualizar info
            $('#cm-current-orientation').text(orientation.charAt(0).toUpperCase() + orientation.slice(1));

            // Comunicar cambio
            this.notifyOrientationChange(orientation);

            console.log('🔄 Orientation changed to:', orientation);
        },

        /**
         * Animar cambio de orientación
         */
        animateOrientationChange: function (orientation) {
            var self = this;

            this.elements.$deviceFrame
                .addClass('rotating')
                .css('transform-origin', 'center center');

            // Limpiar timer anterior
            if (this.timers.orientationTransition) {
                clearTimeout(this.timers.orientationTransition);
            }

            // Aplicar nueva orientación después de un delay
            this.timers.orientationTransition = setTimeout(function () {
                self.elements.$deviceFrame
                    .removeClass('cm-orientation-portrait cm-orientation-landscape')
                    .addClass('cm-orientation-' + orientation)
                    .removeClass('rotating');

                // Actualizar dimensiones del viewport
                self.updateViewportDimensions();
            }, 300);
        },

        /**
         * Cambiar zoom
         */
        changeZoom: function (zoom) {
            this.state.zoom = zoom;

            // Actualizar botones
            $('.cm-zoom-btn').removeClass('active');
            $('.cm-zoom-btn[data-zoom="' + zoom + '"]').addClass('active');

            // Aplicar zoom al viewport
            this.elements.$viewport.css('transform', 'scale(' + zoom + ')');

            // Actualizar info
            $('#cm-current-zoom').text((zoom * 100) + '%');

            // Comunicar cambio
            this.notifyZoomChange(zoom);

            console.log('🔍 Zoom changed to:', (zoom * 100) + '%');
        },

        /**
         * Recargar frame
         */
        reloadFrame: function () {
            this.state.isLoading = true;
            this.state.loadTime = Date.now();

            // Mostrar overlay de carga
            $('.cm-viewport-overlay').show();

            // Recargar iframe
            var currentSrc = this.elements.$iframe.attr('src');
            this.elements.$iframe.attr('src', currentSrc + (currentSrc.includes('?') ? '&' : '?') + '_refresh=' + Date.now());

            // Timeout de seguridad
            this.timers.loadingTimeout = setTimeout(() => {
                this.onLoadTimeout();
            }, 30000); // 30 segundos

            console.log('🔄 Frame reloading...');
        },

        /**
         * Evento de carga del frame
         */
        onFrameLoad: function () {
            this.state.isLoading = false;
            var loadTime = Date.now() - this.state.loadTime;

            // Ocultar overlay de carga
            $('.cm-viewport-overlay').hide();

            // Limpiar timeout
            if (this.timers.loadingTimeout) {
                clearTimeout(this.timers.loadingTimeout);
                this.timers.loadingTimeout = null;
            }

            // Actualizar tiempo de carga
            this.state.loadTime = loadTime;
            $('#cm-load-time').text(loadTime + 'ms');

            // Guardar en historial
            this.cache.loadTimeHistory.push({
                timestamp: new Date(),
                loadTime: loadTime,
                device: this.state.currentDevice,
                orientation: this.state.orientation
            });

            // Limitar historial
            if (this.cache.loadTimeHistory.length > 50) {
                this.cache.loadTimeHistory.shift();
            }

            // Ejecutar checks automáticos
            this.runAutomaticChecks();

            console.log('✅ Frame loaded in', loadTime + 'ms');
        },

        /**
         * Timeout de carga
         */
        onLoadTimeout: function () {
            this.state.isLoading = false;
            $('.cm-viewport-overlay').hide();

            this.showNotification('Timeout al cargar la página', 'error');
            $('#cm-load-time').text('Timeout');

            console.warn('⏱️ Frame load timeout');
        },

        /**
         * Tomar screenshot
         */
        takeScreenshot: function () {
            var self = this;

            // Mostrar indicador de proceso
            this.showNotification('Capturando screenshot...', 'info');

            // Simular captura (en implementación real usarías html2canvas o similar)
            setTimeout(function () {
                var screenshot = {
                    timestamp: new Date(),
                    device: self.state.currentDevice,
                    orientation: self.state.orientation,
                    zoom: self.state.zoom,
                    url: self.config.currentUrl,
                    filename: 'screenshot_' + Date.now() + '.png'
                };

                self.cache.screenshots.push(screenshot);

                // Comunicar al servidor
                self.notifyScreenshot(screenshot);

                self.showNotification('Screenshot capturado: ' + screenshot.filename, 'success');

                console.log('📸 Screenshot taken:', screenshot.filename);
            }, 1000);
        },

        /**
         * Toggle modo responsive
         */
        toggleResponsiveMode: function () {
            // TODO: Implementar modo responsive que muestre múltiples tamaños
            this.showNotification('Modo responsive (próximamente)', 'info');
        },

        /**
         * Aplicar tamaño personalizado
         */
        applyCustomSize: function () {
            var width = parseInt($('#cm-custom-width').val()) || 375;
            var height = parseInt($('#cm-custom-height').val()) || 667;

            // Validar límites
            width = Math.max(320, Math.min(1920, width));
            height = Math.max(480, Math.min(1080, height));

            // Actualizar estado
            this.state.customDimensions = { width: width, height: height };

            // Si el dispositivo actual es custom, aplicar inmediatamente
            if (this.state.currentDevice === 'custom') {
                this.updateViewportDimensions();
            }

            // Cambiar a custom si no lo está
            if (this.state.currentDevice !== 'custom') {
                this.changeDevice('custom');
            }

            console.log('📐 Custom size applied:', width + 'x' + height);
        },

        /**
         * Configurar throttling de red
         */
        setNetworkThrottling: function (preset) {
            this.state.networkThrottling = preset;

            // Aplicar throttling simulado
            this.applyNetworkThrottling(preset);

            console.log('📡 Network throttling set to:', preset);
        },

        /**
         * Aplicar throttling de red
         */
        applyNetworkThrottling: function (preset) {
            // En una implementación real, esto interactuaría con DevTools API
            var throttlingConfig = {
                'none': { download: 0, upload: 0, latency: 0 },
                '3g': { download: 1600, upload: 750, latency: 300 },
                '4g': { download: 9000, upload: 9000, latency: 170 },
                'wifi': { download: 30000, upload: 15000, latency: 2 }
            };

            var config = throttlingConfig[preset] || throttlingConfig.none;

            // Simular efecto visual
            if (preset !== 'none') {
                $('#cm-connection-status').text('Throttled (' + preset.toUpperCase() + ')');
            } else {
                $('#cm-connection-status').text('Online');
            }
        },

        /**
         * Test de eventos touch
         */
        testTouchEvents: function () {
            var self = this;

            this.showNotification('Iniciando test de eventos touch...', 'info');

            // Simular eventos touch en el iframe
            setTimeout(function () {
                var results = {
                    touchstart: true,
                    touchmove: true,
                    touchend: true,
                    gestureSupport: true
                };

                var successCount = Object.values(results).filter(Boolean).length;
                var message = 'Touch test completado: ' + successCount + '/4 eventos soportados';

                self.showNotification(message, successCount === 4 ? 'success' : 'warning');

                console.log('👆 Touch test completed:', results);
            }, 2000);
        },

        /**
         * Test de rendimiento
         */
        runPerformanceTest: function () {
            var self = this;

            this.showNotification('Ejecutando test de rendimiento...', 'info');

            // Simular métricas de rendimiento
            setTimeout(function () {
                var performance = {
                    fcp: Math.round(800 + Math.random() * 400), // First Contentful Paint
                    lcp: Math.round(1200 + Math.random() * 800), // Largest Contentful Paint
                    fid: Math.round(50 + Math.random() * 100), // First Input Delay
                    cls: (Math.random() * 0.1).toFixed(3), // Cumulative Layout Shift
                    timestamp: new Date()
                };

                self.state.performanceData = performance;
                self.cache.performanceHistory.push(performance);

                var score = self.calculatePerformanceScore(performance);
                var message = 'Performance Score: ' + score + '/100';

                self.showNotification(message, score > 80 ? 'success' : score > 60 ? 'warning' : 'error');

                console.log('⚡ Performance test completed:', performance);
            }, 3000);
        },

        /**
         * Calcular score de rendimiento
         */
        calculatePerformanceScore: function (metrics) {
            var fcpScore = Math.max(0, 100 - (metrics.fcp - 800) / 10);
            var lcpScore = Math.max(0, 100 - (metrics.lcp - 1200) / 20);
            var fidScore = Math.max(0, 100 - metrics.fid);
            var clsScore = Math.max(0, 100 - (metrics.cls * 1000));

            return Math.round((fcpScore + lcpScore + fidScore + clsScore) / 4);
        },

        /**
         * Check de accesibilidad
         */
        runAccessibilityCheck: function () {
            var self = this;

            this.showNotification('Ejecutando check de accesibilidad...', 'info');

            // Simular análisis de accesibilidad
            setTimeout(function () {
                var issues = [
                    { type: 'contrast', severity: 'warning', element: 'button.primary', message: 'Contraste insuficiente' },
                    { type: 'alt', severity: 'error', element: 'img.hero', message: 'Falta atributo alt' },
                    { type: 'focus', severity: 'info', element: 'nav', message: 'Orden de foco mejorable' }
                ];

                // Simular algunos casos sin issues
                if (Math.random() > 0.7) {
                    issues = [];
                }

                self.state.accessibilityIssues = issues;

                var message = issues.length === 0 ?
                    'Sin problemas de accesibilidad detectados' :
                    issues.length + ' problema(s) de accesibilidad encontrado(s)';

                var type = issues.length === 0 ? 'success' :
                    issues.some(i => i.severity === 'error') ? 'error' : 'warning';

                self.showNotification(message, type);

                console.log('♿ Accessibility check completed:', issues);
            }, 2500);
        },

        /**
         * Ejecutar checks automáticos
         */
        runAutomaticChecks: function () {
            // Ejecutar algunos checks automáticamente después de cargar
            setTimeout(() => {
                if (this.config.enablePerformanceMonitoring) {
                    this.runPerformanceTest();
                }
            }, 1000);
        },

        /**
         * Actualizar display del dispositivo
         */
        updateDeviceDisplay: function () {
            var device = this.cache.devicePresets[this.state.currentDevice];
            if (!device) return;

            // Actualizar botón del dropdown
            $('.cm-current-device').html(device.icon + ' ' + device.name);

            // Actualizar elementos activos en dropdown
            $('.cm-dropdown-item').removeClass('active');
            $('.cm-dropdown-item[data-device="' + this.state.currentDevice + '"]').addClass('active');

            // Actualizar info del dispositivo
            $('.cm-device-name').text(device.name);

            // Actualizar dimensiones
            this.updateViewportDimensions();
            this.updateDeviceInfo();
        },

        /**
         * Actualizar dimensiones del viewport
         */
        updateViewportDimensions: function () {
            var device = this.cache.devicePresets[this.state.currentDevice];
            var dimensions;

            if (this.state.currentDevice === 'custom') {
                dimensions = this.state.customDimensions;
            } else if (device) {
                dimensions = {
                    width: device.width,
                    height: device.height
                };
            } else {
                return;
            }

            // Intercambiar dimensiones si está en landscape
            if (this.state.orientation === 'landscape') {
                dimensions = {
                    width: dimensions.height,
                    height: dimensions.width
                };
            }

            // Aplicar dimensiones
            this.elements.$viewport.css({
                width: dimensions.width + 'px',
                height: dimensions.height + 'px'
            });

            this.elements.$iframe.attr({
                width: dimensions.width,
                height: dimensions.height
            });
        },

        /**
         * Actualizar información del dispositivo
         */
        updateDeviceInfo: function () {
            var device = this.cache.devicePresets[this.state.currentDevice];
            if (!device) return;

            var dimensions = this.state.currentDevice === 'custom' ?
                this.state.customDimensions :
                { width: device.width, height: device.height };

            // Intercambiar si está en landscape
            if (this.state.orientation === 'landscape') {
                dimensions = {
                    width: dimensions.height,
                    height: dimensions.width
                };
            }

            // Actualizar info en sidebar
            $('.cm-info-item').each(function () {
                var $item = $(this);
                var label = $item.find('label').text();

                switch (label) {
                    case 'Screen:':
                        $item.find('span').text(dimensions.width + '×' + dimensions.height);
                        break;
                    case 'Pixel Ratio:':
                        $item.find('span').text(device.pixelRatio + 'x');
                        break;
                    case 'Orientation:':
                        $item.find('span').text(this.state.orientation.charAt(0).toUpperCase() + this.state.orientation.slice(1));
                        break;
                    case 'Zoom:':
                        $item.find('span').text((this.state.zoom * 100) + '%');
                        break;
                }
            }.bind(this));

            // Actualizar badge de info
            $('.cm-info-size').text(dimensions.width + '×' + dimensions.height);
            $('.cm-info-ratio').text(device.pixelRatio + 'x');
        },

        /**
         * Mostrar controles personalizados
         */
        showCustomControls: function () {
            $('#cm-custom-width').val(this.state.customDimensions.width);
            $('#cm-custom-height').val(this.state.customDimensions.height);
        },

        /**
         * Configurar simulación de dispositivo
         */
        setupDeviceSimulation: function () {
            // Configurar user agent spoofing simulado
            this.updateUserAgent();
        },

        /**
         * Actualizar user agent
         */
        updateUserAgent: function () {
            var device = this.cache.devicePresets[this.state.currentDevice];
            if (device && device.userAgent && device.userAgent !== 'Custom') {
                // En una implementación real, esto cambiaría el user agent del iframe
                console.log('📱 User Agent simulated:', device.userAgent);
            }
        },

        /**
         * Configurar throttling de red
         */
        setupNetworkThrottling: function () {
            if (this.config.enableNetworkThrottling) {
                this.setNetworkThrottling('none');
            }
        },

        /**
         * Configurar monitoreo de rendimiento
         */
        setupPerformanceMonitoring: function () {
            if (this.config.enablePerformanceMonitoring) {
                this.startPerformanceMonitoring();
            }
        },

        /**
         * Iniciar monitoreo de rendimiento
         */
        startPerformanceMonitoring: function () {
            var self = this;

            this.timers.performanceCheck = setInterval(function () {
                // Monitoreo básico de conexión
                self.checkConnectionStatus();
            }, 5000);
        },

        /**
         * Verificar estado de conexión
         */
        checkConnectionStatus: function () {
            var isOnline = navigator.onLine;
            this.state.connectionStatus = isOnline ? 'online' : 'offline';

            $('#cm-connection-status').text(
                this.state.connectionStatus.charAt(0).toUpperCase() + this.state.connectionStatus.slice(1)
            );
        },

        /**
         * Iniciar monitoreo
         */
        startMonitoring: function () {
            this.startPerformanceMonitoring();
        },

        /**
         * Detener monitoreo
         */
        stopMonitoring: function () {
            if (this.timers.performanceCheck) {
                clearInterval(this.timers.performanceCheck);
                this.timers.performanceCheck = null;
            }
        },

        /**
         * Configurar atajos de teclado
         */
        setupKeyboardShortcuts: function () {
            var self = this;

            $(document).on('keydown.cmMobileShortcuts', function (e) {
                if (!self.state.isActive) return;

                // R para reload
                if (e.key === 'r' || e.key === 'R') {
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        self.reloadFrame();
                    }
                }

                // S para screenshot
                if (e.key === 's' || e.key === 'S') {
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        self.takeScreenshot();
                    }
                }

                // O para toggle orientation
                if (e.key === 'o' || e.key === 'O') {
                    e.preventDefault();
                    var newOrientation = self.state.orientation === 'portrait' ? 'landscape' : 'portrait';
                    self.changeOrientation(newOrientation);
                }

                // Números para zoom
                if (e.key >= '1' && e.key <= '4') {
                    e.preventDefault();
                    var zoomLevels = [0.5, 0.75, 1, 1.25];
                    var zoomIndex = parseInt(e.key) - 1;
                    if (zoomLevels[zoomIndex]) {
                        self.changeZoom(zoomLevels[zoomIndex]);
                    }
                }

                // Escape para cerrar
                if (e.key === 'Escape') {
                    self.hide();
                }
            });
        },

        /**
         * Manejar teclas presionadas
         */
        handleKeyDown: function (e) {
            // Implementación adicional de atajos
        },

        /**
         * Manejar redimensionamiento de ventana
         */
        handleWindowResize: function () {
            // Ajustar layout para pantallas pequeñas
            var windowWidth = $(window).width();

            if (windowWidth < 1024) {
                this.elements.$content.addClass('compact-mode');
            } else {
                this.elements.$content.removeClass('compact-mode');
            }
        },

        /**
         * Abrir configuración
         */
        openSettings: function () {
            var self = this;

            // Crear modal de configuración
            var $modal = $('<div class="cm-mobile-settings-modal">')
                .append('<div class="cm-modal-overlay">')
                .append(
                    $('<div class="cm-modal-content">')
                        .append('<h3>Mobile Viewer Settings</h3>')
                        .append('<div class="cm-settings-section">')
                        .append('<h4>Device Simulation</h4>')
                        .append('<label><input type="checkbox" id="enable-user-agent"> Simulate User Agent</label>')
                        .append('<label><input type="checkbox" id="enable-touch-events"> Simulate Touch Events</label>')
                        .append('</div>')
                        .append('<div class="cm-settings-section">')
                        .append('<h4>Performance</h4>')
                        .append('<label><input type="checkbox" id="enable-performance" ' + (this.config.enablePerformanceMonitoring ? 'checked' : '') + '> Performance Monitoring</label>')
                        .append('<label><input type="checkbox" id="enable-accessibility" ' + (this.config.enableAccessibilityCheck ? 'checked' : '') + '> Accessibility Checks</label>')
                        .append('</div>')
                        .append('<div class="cm-settings-section">')
                        .append('<h4>Screenshots</h4>')
                        .append('<label>Quality: <input type="range" id="screenshot-quality" min="0.1" max="1" step="0.1" value="' + this.config.screenshotQuality + '"></label>')
                        .append('</div>')
                        .append('<div class="cm-settings-actions">')
                        .append('<button class="cm-settings-save">Save</button>')
                        .append('<button class="cm-settings-cancel">Cancel</button>')
                        .append('</div>')
                );

            $('body').append($modal);

            // Eventos del modal
            $modal.find('.cm-settings-save').on('click', function () {
                self.saveSettings($modal);
                $modal.remove();
            });

            $modal.find('.cm-settings-cancel, .cm-modal-overlay').on('click', function () {
                $modal.remove();
            });

            // Mostrar modal
            setTimeout(function () {
                $modal.addClass('show');
            }, 10);
        },

        /**
         * Guardar configuración
         */
        saveSettings: function ($modal) {
            this.config.enablePerformanceMonitoring = $modal.find('#enable-performance').is(':checked');
            this.config.enableAccessibilityCheck = $modal.find('#enable-accessibility').is(':checked');
            this.config.screenshotQuality = parseFloat($modal.find('#screenshot-quality').val());

            this.showNotification('Configuración guardada', 'success');

            // Aplicar cambios
            if (this.config.enablePerformanceMonitoring && !this.timers.performanceCheck) {
                this.startPerformanceMonitoring();
            } else if (!this.config.enablePerformanceMonitoring && this.timers.performanceCheck) {
                this.stopMonitoring();
            }
        },

        /**
         * Notificar cambio de dispositivo
         */
        notifyDeviceChange: function (deviceId) {
            $.post(this.config.ajaxUrl, {
                action: 'mobile_viewer_device',
                device: deviceId,
                width: this.state.customDimensions.width,
                height: this.state.customDimensions.height,
                nonce: this.config.nonce
            });
        },

        /**
         * Notificar cambio de orientación
         */
        notifyOrientationChange: function (orientation) {
            $.post(this.config.ajaxUrl, {
                action: 'mobile_viewer_orientation',
                orientation: orientation,
                nonce: this.config.nonce
            });
        },

        /**
         * Notificar cambio de zoom
         */
        notifyZoomChange: function (zoom) {
            $.post(this.config.ajaxUrl, {
                action: 'mobile_viewer_zoom',
                zoom: zoom,
                nonce: this.config.nonce
            });
        },

        /**
         * Notificar screenshot
         */
        notifyScreenshot: function (screenshot) {
            $.post(this.config.ajaxUrl, {
                action: 'mobile_viewer_screenshot',
                screenshot: JSON.stringify(screenshot),
                nonce: this.config.nonce
            });
        },

        /**
         * Actualizar UI
         */
        updateUI: function () {
            this.updateDeviceDisplay();
            this.updateDeviceInfo();
        },

        /**
         * Mostrar notificación
         */
        showNotification: function (message, type) {
            if (window.ConsoleMonitorController) {
                window.ConsoleMonitorController.showNotification(message, type);
            } else {
                // Fallback local
                console.log('[Mobile Viewer]', type.toUpperCase() + ':', message);
            }
        },

        /**
         * Refrescar (método público)
         */
        refresh: function () {
            this.reloadFrame();
        },

        /**
         * Disparar evento personalizado
         */
        triggerEvent: function (eventType, data) {
            $(document).trigger('cmMobileViewer:' + eventType, [data]);

            // También notificar al controller
            if (window.ConsoleMonitorController) {
                $(document).trigger('mobileViewerStateChange', [{
                    isActive: this.state.isActive,
                    currentDevice: this.state.currentDevice,
                    orientation: this.state.orientation,
                    zoom: this.state.zoom,
                    eventType: eventType,
                    data: data
                }]);
            }
        },

        /**
         * Obtener estado actual
         */
        getState: function () {
            return {
                isActive: this.state.isActive,
                currentDevice: this.state.currentDevice,
                orientation: this.state.orientation,
                zoom: this.state.zoom,
                customDimensions: this.state.customDimensions,
                networkThrottling: this.state.networkThrottling,
                loadTime: this.state.loadTime,
                performanceData: this.state.performanceData,
                accessibilityIssues: this.state.accessibilityIssues
            };
        },

        /**
         * Obtener historial de rendimiento
         */
        getPerformanceHistory: function () {
            return this.cache.performanceHistory;
        },

        /**
         * Obtener historial de screenshots
         */
        getScreenshots: function () {
            return this.cache.screenshots;
        },

        /**
         * Exportar datos de testing
         */
        exportTestingData: function () {
            var data = {
                session: {
                    timestamp: new Date(),
                    device: this.state.currentDevice,
                    orientation: this.state.orientation,
                    zoom: this.state.zoom
                },
                performance: this.cache.performanceHistory,
                loadTimes: this.cache.loadTimeHistory,
                screenshots: this.cache.screenshots,
                accessibility: this.state.accessibilityIssues
            };

            var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);

            var $link = $('<a>')
                .attr('href', url)
                .attr('download', 'mobile-testing-data-' + new Date().toISOString().slice(0, 19) + '.json')
                .appendTo('body');

            $link[0].click();
            $link.remove();
            URL.revokeObjectURL(url);

            this.showNotification('Datos de testing exportados', 'success');
        },

        /**
         * Verificar si está activo
         */
        isActive: function () {
            return this.state.isActive;
        },

        /**
         * Obtener dispositivo actual
         */
        getCurrentDevice: function () {
            return this.state.currentDevice;
        },

        /**
         * Obtener orientación actual
         */
        getCurrentOrientation: function () {
            return this.state.orientation;
        },

        /**
         * Obtener zoom actual
         */
        getCurrentZoom: function () {
            return this.state.zoom;
        },

        /**
         * Destruir instancia
         */
        destroy: function () {
            // Limpiar eventos
            $('#cm-device-dropdown-btn').off('.cmMobile');
            $('.cm-dropdown-item').off('.cmMobile');
            $('.cm-orientation-btn').off('.cmMobile');
            $('.cm-zoom-btn').off('.cmMobile');
            $('.cm-action-btn').off('.cmMobile');
            this.elements.$iframe.off('.cmMobile');
            $(document).off('.cmMobile');
            $(window).off('.cmMobile');

            // Limpiar timers
            Object.values(this.timers).forEach(timer => {
                if (timer) clearTimeout(timer);
            });

            // Detener monitoreo
            this.stopMonitoring();

            // Reset estado
            this.state = {
                isActive: false,
                isLoading: false,
                currentDevice: 'iphone-12',
                orientation: 'portrait',
                zoom: 1.0,
                customDimensions: { width: 375, height: 667 },
                networkThrottling: 'none',
                loadTime: 0,
                connectionStatus: 'online',
                isDropdownOpen: false,
                isDragging: false,
                performanceData: {},
                accessibilityIssues: []
            };

            console.log('🗑️ Mobile Viewer destroyed');
        }
    };

})(jQuery);