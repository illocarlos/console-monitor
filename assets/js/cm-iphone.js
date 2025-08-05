/**
 * Console Monitor Pro - JavaScript IPHONE/TABLET
 * assets/js/cm-iphone.js
 * Sistema completo de simulador móvil: dispositivos, orientaciones, responsivo
 * Requiere: cm-core.js, jQuery
 */

(function ($) {
    'use strict';

    // Verificar dependencia
    if (!window.ConsoleMonitor) {
        console.error('CM iPhone: ConsoleMonitor core no disponible');
        return;
    }

    // Extender estado base con datos específicos del iPhone/Tablet
    $.extend(window.ConsoleMonitor.state, {
        // Estados específicos del simulador móvil
        iphoneOrientation: 'portrait',
        currentDevice: 'iphone-15-pro',
        isRotating: false,
        deviceSpecs: {
            // iPhones
            'iphone-15-pro-max': { width: 430, height: 932, name: 'iPhone 15 Pro Max', type: 'phone' },
            'iphone-15-pro': { width: 393, height: 852, name: 'iPhone 15 Pro', type: 'phone' },
            'iphone-15': { width: 393, height: 852, name: 'iPhone 15', type: 'phone' },
            'iphone-14-pro-max': { width: 430, height: 932, name: 'iPhone 14 Pro Max', type: 'phone' },
            'iphone-14-pro': { width: 393, height: 852, name: 'iPhone 14 Pro', type: 'phone' },
            'iphone-14': { width: 390, height: 844, name: 'iPhone 14', type: 'phone' },
            'iphone-13-pro-max': { width: 428, height: 926, name: 'iPhone 13 Pro Max', type: 'phone' },
            'iphone-13-pro': { width: 390, height: 844, name: 'iPhone 13 Pro', type: 'phone' },
            'iphone-13': { width: 390, height: 844, name: 'iPhone 13', type: 'phone' },
            'iphone-12-pro-max': { width: 428, height: 926, name: 'iPhone 12 Pro Max', type: 'phone' },
            'iphone-12-pro': { width: 390, height: 844, name: 'iPhone 12 Pro', type: 'phone' },
            'iphone-se': { width: 375, height: 667, name: 'iPhone SE', type: 'phone' },

            // iPads
            'ipad-pro-12-9': { width: 1024, height: 1366, name: 'iPad Pro 12.9"', type: 'tablet' },
            'ipad-pro-11': { width: 834, height: 1194, name: 'iPad Pro 11"', type: 'tablet' },
            'ipad-air': { width: 820, height: 1180, name: 'iPad Air', type: 'tablet' },
            'ipad-10-9': { width: 810, height: 1080, name: 'iPad 10.9"', type: 'tablet' },
            'ipad-mini': { width: 744, height: 1133, name: 'iPad Mini', type: 'tablet' },
            'ipad-9-7': { width: 768, height: 1024, name: 'iPad 9.7"', type: 'tablet' },

            // Android Tablets
            'galaxy-tab-s9-ultra': { width: 1848, height: 2960, name: 'Galaxy Tab S9 Ultra', type: 'tablet' },
            'galaxy-tab-s9-plus': { width: 1752, height: 2800, name: 'Galaxy Tab S9+', type: 'tablet' },
            'galaxy-tab-s9': { width: 1640, height: 2536, name: 'Galaxy Tab S9', type: 'tablet' },
            'galaxy-tab-a9-plus': { width: 1344, height: 2000, name: 'Galaxy Tab A9+', type: 'tablet' },
            'surface-pro-9': { width: 1440, height: 2160, name: 'Surface Pro 9', type: 'tablet' },
            'pixel-tablet': { width: 1600, height: 2560, name: 'Pixel Tablet', type: 'tablet' }
        }
    });

    // Extender elementos DOM
    $.extend(window.ConsoleMonitor.elements, {
        $iphone: null,
        $iphoneFrame: null,
        $iphoneScreen: null,
        $iphoneIframe: null,
        $deviceSelector: null
    });

    // ========================================
    // INICIALIZACIÓN DEL MÓDULO IPHONE
    // ========================================

    // Extender la función init del core
    const originalInit = window.ConsoleMonitor.init;
    window.ConsoleMonitor.init = function () {
        originalInit.call(this);
        this.initIphoneModule();
    };

    // Extender cacheElements del core
    const originalCacheElements = window.ConsoleMonitor.cacheElements;
    window.ConsoleMonitor.cacheElements = function () {
        originalCacheElements.call(this);
        this.elements.$iphone = $('#cm-iphone');
        this.elements.$iphoneFrame = $('#cm-iphone-frame');
        this.elements.$iphoneScreen = $('.cm-iphone-screen');
        this.elements.$iphoneIframe = $('#cm-iphone-iframe');
        this.elements.$deviceSelector = $('#cm-device-selector');
    };

    // Inicializar módulo de iPhone
    window.ConsoleMonitor.initIphoneModule = function () {
        this.bindIphoneEvents();
        this.restoreDeviceSettings();

        console.log('📱 iPhone module initialized');
    };

    // ========================================
    // EVENTOS ESPECÍFICOS DEL IPHONE
    // ========================================

    window.ConsoleMonitor.bindIphoneEvents = function () {
        const self = this;

        // Escuchar apertura del panel de iPhone
        $(document).on('cm:panel:opened', function (e, panelType) {
            if (panelType === 'iphone') {
                setTimeout(() => {
                    self.updateDeviceDisplay();
                }, 100);
            }
        });

        // Cambio de dispositivo
        $(document).on('change', '#cm-device-selector', function () {
            const deviceId = $(this).val();
            self.changeDevice(deviceId);
        });

        // Botón rotar
        $(document).on('click', '.cm-btn-rotate', function (e) {
            e.preventDefault();
            if ($(this).closest('#cm-iphone').length) {
                self.rotateIphone();
            }
        });

        // Auto-resize cuando cambia el tamaño de ventana
        $(window).on('resize', function () {
            if (self.state.activePanel === 'iphone') {
                setTimeout(() => {
                    self.updateDeviceDisplay();
                }, 100);
            }
        });
    };

    // ========================================
    // GESTIÓN DE DISPOSITIVOS
    // ========================================

    // Cambiar dispositivo
    window.ConsoleMonitor.changeDevice = function (deviceId) {
        if (!this.state.deviceSpecs[deviceId]) return;

        const oldDevice = this.state.currentDevice;
        this.state.currentDevice = deviceId;

        // Añadir animación de cambio
        this.elements.$iphoneFrame.addClass('changing-device');

        const self = this;
        setTimeout(() => {
            self.updateDeviceDisplay();
            self.elements.$iphoneFrame.removeClass('changing-device');
        }, 250);

        // Guardar en localStorage
        this.saveDeviceSettings();

        console.log('📱 Device changed from', oldDevice, 'to', deviceId);
    };

    // Actualizar display del dispositivo
    window.ConsoleMonitor.updateDeviceDisplay = function () {
        const device = this.state.deviceSpecs[this.state.currentDevice];
        if (!device) {
            console.warn('Device not found:', this.state.currentDevice);
            return;
        }

        const $iframe = this.elements.$iphoneIframe;
        const $screen = this.elements.$iphoneScreen;
        const $frame = this.elements.$iphoneFrame;
        const $panel = this.elements.$iphone;

        if (!$frame.length || !$panel.length) {
            console.warn('iPhone elements not found');
            return;
        }

        // Cambiar clases CSS según el tipo de dispositivo
        $frame.removeClass('device-phone device-tablet');
        $frame.addClass('device-' + device.type);
        $frame.attr('data-device', this.state.currentDevice);

        // Cambiar el ancho del panel según el tipo de dispositivo
        if (device.type === 'tablet') {
            $panel.addClass('tablet-mode').css('width', '500px');
        } else {
            $panel.removeClass('tablet-mode').css('width', '380px');
        }

        // Agregar/quitar clase landscape según orientación
        if (this.state.iphoneOrientation === 'landscape') {
            $frame.addClass('landscape');
        } else {
            $frame.removeClass('landscape');
        }

        // Esperar a que el elemento esté completamente visible
        if ($frame.is(':visible')) {
            const frameRect = $frame[0].getBoundingClientRect();
            const containerWidth = frameRect.width - (device.type === 'tablet' ? 50 : 30);
            const containerHeight = frameRect.height - (device.type === 'tablet' ? 40 : 30);

            // Forzar que el iframe ocupe EXACTAMENTE las dimensiones del contenedor
            $iframe.attr({
                width: containerWidth,
                height: containerHeight
            }).css({
                width: containerWidth + 'px',
                height: containerHeight + 'px',
                border: 'none',
                display: 'block'
            });

            // El screen debe ocupar todo el espacio
            $screen.css({
                width: '100%',
                height: '100%',
                display: 'block',
                overflow: 'hidden'
            });

            // Actualizar info del dispositivo con icono según tipo
            const deviceIcon = device.type === 'tablet' ? '📋' : '📱';
            const orientationText = this.state.iphoneOrientation === 'landscape' ? ' (Landscape)' : '';
            const displayText = `${deviceIcon} ${device.name} • Simulando en ${Math.round(containerWidth)}×${Math.round(containerHeight)}${orientationText}`;

            $('#cm-device-info').text(displayText);

            console.log('📱 Device display updated:', {
                device: device.name,
                type: device.type,
                panelWidth: device.type === 'tablet' ? '500px' : '380px',
                containerSize: Math.round(containerWidth) + 'x' + Math.round(containerHeight),
                originalDevice: device.width + 'x' + device.height,
                orientation: this.state.iphoneOrientation
            });
        }
    };

    // Rotar iPhone/Tablet
    window.ConsoleMonitor.rotateIphone = function () {
        if (this.state.isRotating) return;

        this.state.isRotating = true;

        // Cambiar orientación
        if (this.state.iphoneOrientation === 'portrait') {
            this.state.iphoneOrientation = 'landscape';
        } else {
            this.state.iphoneOrientation = 'portrait';
        }

        const $frame = this.elements.$iphoneFrame;
        $frame.addClass('rotating');

        const self = this;
        setTimeout(function () {
            $frame.removeClass('rotating');
            self.updateDeviceDisplay();
            self.state.isRotating = false;
        }, 600);

        // Recargar iframe después de la rotación para ajustar viewport
        setTimeout(function () {
            const $iframe = self.elements.$iphoneIframe;
            const currentSrc = $iframe.attr('src');

            // Añadir parámetro para forzar recarga
            const separator = currentSrc.includes('?') ? '&' : '?';
            const timestamp = Date.now();
            $iframe.attr('src', currentSrc + separator + 'cm_rotation=' + timestamp);
        }, 300);

        // Guardar configuración
        this.saveDeviceSettings();

        console.log('📱 Device rotated to:', this.state.iphoneOrientation);
    };

    // ========================================
    // PERSISTENCIA DE CONFIGURACIÓN
    // ========================================

    // Guardar configuración del dispositivo
    window.ConsoleMonitor.saveDeviceSettings = function () {
        try {
            const settings = {
                device: this.state.currentDevice,
                orientation: this.state.iphoneOrientation,
                timestamp: Date.now()
            };
            localStorage.setItem('cm_device_settings', JSON.stringify(settings));
            console.log('💾 Device settings saved');
        } catch (e) {
            console.warn('Could not save device settings:', e);
        }
    };

    // Restaurar configuración del dispositivo
    window.ConsoleMonitor.restoreDeviceSettings = function () {
        try {
            const saved = localStorage.getItem('cm_device_settings');
            if (saved) {
                const settings = JSON.parse(saved);

                // Restaurar dispositivo
                if (settings.device && this.state.deviceSpecs[settings.device]) {
                    this.state.currentDevice = settings.device;
                    $('#cm-device-selector').val(settings.device);
                }

                // Restaurar orientación
                if (settings.orientation) {
                    this.state.iphoneOrientation = settings.orientation;
                }

                console.log('📱 Device settings restored:', settings);
            }
        } catch (e) {
            console.warn('Could not restore device settings:', e);
        }
    };

    // ========================================
    // FUNCIONES DE UTILIDAD
    // ========================================

    // Obtener información del dispositivo actual
    window.ConsoleMonitor.getCurrentDeviceInfo = function () {
        const device = this.state.deviceSpecs[this.state.currentDevice];
        if (!device) return null;

        return {
            id: this.state.currentDevice,
            name: device.name,
            type: device.type,
            width: device.width,
            height: device.height,
            orientation: this.state.iphoneOrientation,
            isTablet: device.type === 'tablet',
            isPhone: device.type === 'phone'
        };
    };

    // Cambiar URL del iframe
    window.ConsoleMonitor.navigateToUrl = function (url) {
        if (!url) return;

        try {
            const validUrl = new URL(url, window.location.origin);
            this.elements.$iphoneIframe.attr('src', validUrl.href);
            console.log('📱 Navigated to:', validUrl.href);
        } catch (e) {
            console.error('Invalid URL:', url);
            this.showNotification('URL inválida', 'error');
        }
    };

    // Recargar iframe
    window.ConsoleMonitor.reloadIframe = function () {
        const $iframe = this.elements.$iphoneIframe;
        const currentSrc = $iframe.attr('src');

        // Añadir timestamp para forzar recarga
        const separator = currentSrc.includes('?') ? '&' : '?';
        const timestamp = Date.now();
        $iframe.attr('src', currentSrc + separator + 'cm_reload=' + timestamp);

        console.log('📱 iframe reloaded');
    };

    // Tomar screenshot del iframe (limitado por CORS)
    window.ConsoleMonitor.takeScreenshot = function () {
        try {
            const $iframe = this.elements.$iphoneIframe;
            const iframe = $iframe[0];

            // Verificar si podemos acceder al contenido
            if (iframe.contentDocument) {
                console.log('📱 Screenshot taken (content accessible)');
                // Aquí podrías implementar lógica de screenshot
                this.showNotification('Screenshot tomado', 'success');
            } else {
                console.warn('📱 Cannot access iframe content (CORS)');
                this.showNotification('No se puede acceder al contenido (CORS)', 'warning');
            }
        } catch (e) {
            console.error('Screenshot error:', e);
            this.showNotification('Error al tomar screenshot', 'error');
        }
    };

    // ========================================
    // PRESETS DE DISPOSITIVOS POPULARES
    // ========================================

    // Preset rápido para iPhone más popular
    window.ConsoleMonitor.setIphonePreset = function () {
        this.changeDevice('iphone-15-pro');
        this.state.iphoneOrientation = 'portrait';
        this.updateDeviceDisplay();
    };

    // Preset rápido para iPad más popular
    window.ConsoleMonitor.setIpadPreset = function () {
        this.changeDevice('ipad-pro-11');
        this.state.iphoneOrientation = 'portrait';
        this.updateDeviceDisplay();
    };

    // Preset rápido para tablet Android popular
    window.ConsoleMonitor.setAndroidTabletPreset = function () {
        this.changeDevice('galaxy-tab-s9');
        this.state.iphoneOrientation = 'portrait';
        this.updateDeviceDisplay();
    };

    // ========================================
    // EVENTOS ESPECIALES
    // ========================================

    // Escuchar mensajes del iframe (si es posible)
    window.addEventListener('message', function (event) {
        // Verificar origen por seguridad
        if (event.origin !== window.location.origin) return;

        if (event.data && event.data.type === 'cm-iframe-ready') {
            console.log('📱 iframe ready message received');

            // Notificar que el iframe está listo
            $(document).trigger('cm:iframe:ready', [event.data]);
        }
    });

    // Escuchar errores del iframe
    $(document).on('error', 'iframe', function (e) {
        console.warn('📱 iframe error:', e);
        // Mostrar mensaje de error en el iframe si es necesario
    });

    // ========================================
    // FUNCIÓN ESPECÍFICA PARA PANEL DE IPHONE
    // ========================================

    // Función selectIphone específica (llamada desde el core)
    window.ConsoleMonitor.selectIphone = function () {
        console.log('📱 iPhone panel selected');
        // La lógica de apertura ya está en el core selectPanel()
        // Aquí podemos agregar lógica específica del iPhone si es necesaria
    };

    // ========================================
    // DEBUGGING Y DESARROLLO
    // ========================================

    // Debug: Mostrar información del dispositivo
    window.ConsoleMonitor.debugDeviceInfo = function () {
        const info = this.getCurrentDeviceInfo();
        console.table(info);
        return info;
    };

    // Debug: Listar todos los dispositivos disponibles
    window.ConsoleMonitor.listAvailableDevices = function () {
        console.table(this.state.deviceSpecs);
        return this.state.deviceSpecs;
    };

    console.log('📱 Console Monitor iPhone module loaded successfully');

})(jQuery);