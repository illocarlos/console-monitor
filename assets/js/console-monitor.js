/**
 * Console Monitor Pro - Console Monitor JavaScript
 * Maneja toda la lógica del panel de monitoreo de consola
 */

(function ($) {
    'use strict';

    // Namespace global
    window.ConsoleMonitorConsole = {

        // Configuración por defecto
        config: {
            ajaxUrl: '',
            nonce: '',
            maxLogs: 200,
            autoRefresh: false,
            fileMonitor: false,
            refreshInterval: 3000,
            fileMonitorInterval: 2000,
            filterTypes: ['user', 'system', 'all'],
            logTypes: ['log', 'error', 'warn', 'info', 'debug'],
            enableSearch: true,
            enableExport: true,
            enableStackTrace: true
        },

        // Estado del console
        state: {
            isVisible: false,
            isMinimized: false,
            currentFilter: 'user',
            autoRefreshEnabled: false,
            fileMonitorEnabled: false,
            searchQuery: '',
            selectedLogs: [],
            lastLogId: 0,
            isResizing: false,
            logBuffer: [],
            statistics: {
                total: 0,
                user: 0,
                system: 0,
                errors: 0
            }
        },

        // Elementos del DOM
        elements: {
            $panel: null,
            $header: null,
            $content: null,
            $logs: null,
            $footer: null,
            $filters: null,
            $actions: null,
            $stats: null,
            $status: null,
            $resizer: null
        },

        // Timers e intervalos
        timers: {
            autoRefresh: null,
            fileMonitor: null,
            searchDebounce: null,
            statusBlink: null
        },

        // Cache de logs
        cache: {
            allLogs: [],
            filteredLogs: [],
            searchResults: []
        },

        /**
         * Inicializar el console monitor
         */
        init: function (options) {
            // Extender configuración
            this.config = $.extend(true, this.config, options);

            // Actualizar estado inicial
            this.state.autoRefreshEnabled = this.config.autoRefresh;
            this.state.fileMonitorEnabled = this.config.fileMonitor;

            // Cachear elementos del DOM
            this.cacheElements();

            // Configurar eventos
            this.bindEvents();

            // Cargar logs del buffer inicial
            this.loadInitialLogs();

            // Configurar funcionalidades
            this.setupSearch();
            this.setupResize();
            this.setupKeyboardShortcuts();

            // Inicializar componentes
            if (this.state.autoRefreshEnabled) {
                this.enableAutoRefresh();
            }

            if (this.state.fileMonitorEnabled) {
                this.enableFileMonitor();
            }

            // Actualizar UI inicial
            this.updateUI();

            console.log('✅ Console Monitor initialized');
        },

        /**
         * Cachear elementos del DOM
         */
        cacheElements: function () {
            this.elements.$panel = $('#cm-console-panel');
            this.elements.$header = $('.cm-console-header');
            this.elements.$content = $('.cm-console-content');
            this.elements.$logs = $('#cm-console-logs');
            this.elements.$footer = $('.cm-console-footer');
            this.elements.$filters = $('.cm-filter-btn');
            this.elements.$actions = $('.cm-action-btn');
            this.elements.$stats = $('.cm-console-stats');
            this.elements.$status = $('#cm-console-status');
            this.elements.$resizer = $('#cm-console-resizer');

            // Verificar elementos críticos
            if (!this.elements.$panel.length) {
                console.warn('⚠️ Console panel not found');
                return false;
            }

            return true;
        },

        /**
         * Configurar eventos
         */
        bindEvents: function () {
            var self = this;

            // Eventos de filtros
            this.elements.$filters.on('click.cmConsole', function (e) {
                e.preventDefault();
                var filter = $(this).data('filter') || 'all';
                self.setFilter(filter);
            });

            // Eventos de acciones
            this.elements.$actions.on('click.cmConsole', function (e) {
                e.preventDefault();
                var action = $(this).attr('id').replace('cm-', '').replace('-btn', '');
                self.handleAction(action);
            });

            // Eventos de logs individuales
            this.elements.$logs.on('click.cmConsole', '.console-log-item', function (e) {
                if (e.ctrlKey || e.metaKey) {
                    self.toggleLogSelection($(this));
                } else {
                    self.showLogDetails($(this));
                }
            });

            // Doble click para highlight
            this.elements.$logs.on('dblclick.cmConsole', '.console-log-item', function (e) {
                self.highlightLog($(this));
            });

            // Context menu para logs
            this.elements.$logs.on('contextmenu.cmConsole', '.console-log-item', function (e) {
                e.preventDefault();
                self.showContextMenu($(this), e);
            });

            // Eventos del header para drag
            this.elements.$header.on('mousedown.cmConsole', function (e) {
                if (!$(e.target).is('button, .cm-action-btn')) {
                    self.startDrag(e);
                }
            });

            // Auto-scroll con wheel
            this.elements.$logs.on('wheel.cmConsole', function (e) {
                self.handleScroll(e);
            });

            // Eventos globales
            $(document).on('keydown.cmConsole', function (e) {
                if (self.state.isVisible) {
                    self.handleKeyDown(e);
                }
            });

            $(window).on('beforeunload.cmConsole', function () {
                self.saveState();
            });
        },

        /**
         * Cargar logs iniciales del buffer
         */
        loadInitialLogs: function () {
            if (window.ConsoleMonitorPro && window.ConsoleMonitorPro.logBuffer) {
                this.cache.allLogs = window.ConsoleMonitorPro.logBuffer || [];
                this.processNewLogs(this.cache.allLogs);
            }
        },

        /**
         * Mostrar/Ocultar panel
         */
        show: function () {
            if (this.state.isVisible) return;

            this.state.isVisible = true;

            this.elements.$panel
                .addClass('entering active')
                .show()
                .css({
                    opacity: 0,
                    transform: 'translate(-50%, -50%) scale(0.8)'
                })
                .animate({
                    opacity: 1
                }, {
                    duration: 400,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    step: function (now) {
                        var scale = 0.8 + (0.2 * now);
                        $(this).css('transform', 'translate(-50%, -50%) scale(' + scale + ')');
                    },
                    complete: function () {
                        $(this).removeClass('entering');
                        this.elements.$resizer.show();
                        this.refreshLogs();
                        this.triggerEvent('shown');
                    }.bind(this)
                });

            // Foco inicial
            this.elements.$panel.focus();

            console.log('🐛 Console Monitor shown');
        },

        /**
         * Ocultar panel
         */
        hide: function () {
            if (!this.state.isVisible) return;

            this.state.isVisible = false;

            this.elements.$panel
                .addClass('leaving')
                .animate({
                    opacity: 0
                }, {
                    duration: 300,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    step: function (now) {
                        var scale = 0.9 + (0.1 * now);
                        $(this).css('transform', 'translate(-50%, -50%) scale(' + scale + ')');
                    },
                    complete: function () {
                        $(this).removeClass('leaving active').hide();
                        this.elements.$resizer.hide();
                        this.triggerEvent('hidden');
                    }.bind(this)
                });

            console.log('❌ Console Monitor hidden');
        },

        /**
         * Toggle visibility
         */
        toggle: function () {
            if (this.state.isVisible) {
                this.hide();
            } else {
                this.show();
            }
        },

        /**
         * Configurar filtro
         */
        setFilter: function (filter) {
            if (!this.config.filterTypes.includes(filter)) {
                filter = 'all';
            }

            this.state.currentFilter = filter;

            // Actualizar botones
            this.elements.$filters.removeClass('cm-filter-active');
            this.elements.$filters.filter('[data-filter="' + filter + '"]').addClass('cm-filter-active');

            // Filtrar logs
            this.applyFilter();

            // Actualizar estadísticas
            this.updateStatistics();

            console.log('🔍 Filter set to:', filter);
        },

        /**
         * Aplicar filtro actual
         */
        applyFilter: function () {
            var self = this;
            var filter = this.state.currentFilter;

            this.elements.$logs.find('.console-log-item').each(function () {
                var $log = $(this);
                var category = $log.data('category') || 'system';
                var shouldShow = false;

                switch (filter) {
                    case 'all':
                        shouldShow = true;
                        break;
                    case 'user':
                        shouldShow = (category === 'user' || category === 'my');
                        break;
                    case 'system':
                        shouldShow = (category === 'system');
                        break;
                }

                $log.toggleClass('hidden', !shouldShow);
            });

            // Scroll al final si hay logs visibles
            this.scrollToBottom();
        },

        /**
         * Manejar acciones
         */
        handleAction: function (action) {
            switch (action) {
                case 'auto-refresh':
                    this.toggleAutoRefresh();
                    break;
                case 'file-monitor':
                    this.toggleFileMonitor();
                    break;
                case 'clear-logs':
                    this.clearLogs();
                    break;
                case 'console-settings':
                    this.openSettings();
                    break;
                case 'minimize-console':
                    this.minimize();
                    break;
                case 'close-console':
                    this.hide();
                    break;
                default:
                    console.warn('Unknown action:', action);
            }
        },

        /**
         * Toggle auto-refresh
         */
        toggleAutoRefresh: function () {
            if (this.state.autoRefreshEnabled) {
                this.disableAutoRefresh();
            } else {
                this.enableAutoRefresh();
            }
        },

        /**
         * Habilitar auto-refresh
         */
        enableAutoRefresh: function () {
            var self = this;

            this.state.autoRefreshEnabled = true;
            $('#cm-auto-refresh-btn').addClass('auto-refresh-active active');

            this.timers.autoRefresh = setInterval(function () {
                self.refreshLogs();
            }, this.config.refreshInterval);

            this.addLog('info', 'Auto-refresh activado (cada ' + (this.config.refreshInterval / 1000) + 's)', '', '', 'js', 'user');
            console.log('🔄 Auto-refresh enabled');
        },

        /**
         * Deshabilitar auto-refresh
         */
        disableAutoRefresh: function () {
            this.state.autoRefreshEnabled = false;
            $('#cm-auto-refresh-btn').removeClass('auto-refresh-active active');

            if (this.timers.autoRefresh) {
                clearInterval(this.timers.autoRefresh);
                this.timers.autoRefresh = null;
            }

            this.addLog('info', 'Auto-refresh desactivado', '', '', 'js', 'user');
            console.log('⏹️ Auto-refresh disabled');
        },

        /**
         * Toggle file monitor
         */
        toggleFileMonitor: function () {
            if (this.state.fileMonitorEnabled) {
                this.disableFileMonitor();
            } else {
                this.enableFileMonitor();
            }
        },

        /**
         * Habilitar file monitor
         */
        enableFileMonitor: function () {
            var self = this;

            this.state.fileMonitorEnabled = true;
            $('#cm-file-monitor-btn').addClass('file-monitor-active active');

            this.timers.fileMonitor = setInterval(function () {
                self.checkFileChanges();
            }, this.config.fileMonitorInterval);

            this.addLog('info', 'Monitoreo de archivos activado (cada ' + (this.config.fileMonitorInterval / 1000) + 's)', '', '', 'js', 'user');
            console.log('📁 File monitor enabled');
        },

        /**
         * Deshabilitar file monitor
         */
        disableFileMonitor: function () {
            this.state.fileMonitorEnabled = false;
            $('#cm-file-monitor-btn').removeClass('file-monitor-active active');

            if (this.timers.fileMonitor) {
                clearInterval(this.timers.fileMonitor);
                this.timers.fileMonitor = null;
            }

            this.addLog('info', 'Monitoreo de archivos desactivado', '', '', 'js', 'user');
            console.log('📁 File monitor disabled');
        },

        /**
         * Refrescar logs
         */
        refreshLogs: function () {
            var self = this;

            this.setStatus('checking');

            $.post(this.config.ajaxUrl, {
                action: 'console_monitor_get_logs',
                filter: this.state.currentFilter,
                last_id: this.state.lastLogId,
                nonce: this.config.nonce
            }, function (response) {
                self.setStatus('active');

                if (response.success && response.data.logs) {
                    self.processNewLogs(response.data.logs);
                    self.state.lastLogId = response.data.last_id || self.state.lastLogId;
                }
            }).fail(function () {
                self.setStatus('error');
                self.addLog('error', 'Error al refrescar logs', '', '', 'js', 'system');
            });
        },

        /**
         * Verificar cambios en archivos
         */
        checkFileChanges: function () {
            var self = this;

            this.setStatus('checking');

            $.post(this.config.ajaxUrl, {
                action: 'console_monitor_file_changes',
                nonce: this.config.nonce
            }, function (response) {
                self.setStatus('active');

                if (response.success && response.data.length > 0) {
                    response.data.forEach(function (fileChange) {
                        self.addLog('info', 'Archivo modificado: ' + fileChange.file + ' (' + fileChange.modified + ')', fileChange.path, '', 'js', 'user');

                        // Procesar console.logs encontrados
                        if (fileChange.console_logs && fileChange.console_logs.length > 0) {
                            fileChange.console_logs.forEach(function (consoleLog) {
                                self.addLog(consoleLog.type, consoleLog.message + ' [desde: ' + consoleLog.file + ']', '', '', 'js', 'user');
                            });
                        }
                    });
                }
            }).fail(function () {
                self.setStatus('error');
            });
        },

        /**
         * Procesar nuevos logs
         */
        processNewLogs: function (logs) {
            var self = this;

            if (!Array.isArray(logs)) return;

            logs.forEach(function (log) {
                self.addLogToDOM(log);
                self.cache.allLogs.push(log);
            });

            // Limitar cache
            if (this.cache.allLogs.length > this.config.maxLogs) {
                var excess = this.cache.allLogs.length - this.config.maxLogs;
                this.cache.allLogs.splice(0, excess);

                // Remover elementos DOM antiguos
                this.elements.$logs.find('.console-log-item').slice(0, excess).remove();
            }

            // Actualizar estadísticas
            this.updateStatistics();

            // Aplicar filtro actual
            this.applyFilter();
        },

        /**
         * Añadir log individual
         */
        addLog: function (type, message, source, timestamp, logType, category) {
            var logEntry = {
                type: type,
                message: message,
                source: source || '',
                timestamp: timestamp || new Date().toLocaleTimeString(),
                logType: logType || 'js',
                category: category || 'user'
            };

            this.addLogToDOM(logEntry);
            this.cache.allLogs.push(logEntry);
            this.updateStatistics();
            this.applyFilter();
        },

        /**
         * Añadir log al DOM
         */
        addLogToDOM: function (log) {
            var typeClass = log.type.toLowerCase().replace(/[^a-z0-9]/g, '_');
            var categoryClass = log.category || 'system';
            var logTypeClass = log.logType || 'js';

            var $logItem = $('<div class="console-log-item console-' + typeClass + '" data-category="' + categoryClass + '" data-log-type="' + logTypeClass + '">')
                .append('<span class="console-type ' + logTypeClass + '">' + log.type.toUpperCase() + '</span>')
                .append('<span class="console-timestamp">[' + log.timestamp + ']</span>')
                .append('<span class="console-message">' + this.escapeHtml(log.message) + '</span>');

            if (log.source) {
                $logItem.append('<span class="console-source">' + this.escapeHtml(log.source) + '</span>');
            }

            // Añadir al inicio de la lista
            this.elements.$logs.prepend($logItem);

            // Animar entrada
            setTimeout(function () {
                $logItem.addClass('visible');
            }, 10);
        },

        /**
         * Limpiar todos los logs
         */
        clearLogs: function () {
            var self = this;

            // Animar salida
            this.elements.$logs.find('.console-log-item').addClass('leaving').fadeOut(300, function () {
                $(this).remove();
            });

            // Limpiar cache
            this.cache.allLogs = [];
            this.state.lastLogId = 0;

            // Comunicar con servidor
            $.post(this.config.ajaxUrl, {
                action: 'console_monitor_clear',
                nonce: this.config.nonce
            });

            // Actualizar estadísticas
            setTimeout(function () {
                self.updateStatistics();
                self.addLog('info', 'Logs limpiados', '', '', 'js', 'user');
            }, 350);

            console.log('🗑️ Logs cleared');
        },

        /**
         * Minimizar panel
         */
        minimize: function () {
            this.state.isMinimized = !this.state.isMinimized;
            this.elements.$panel.toggleClass('minimized', this.state.isMinimized);

            var $btn = $('#cm-minimize-console-btn');
            $btn.text(this.state.isMinimized ? '+' : '−');

            console.log(this.state.isMinimized ? '📦 Console minimized' : '📖 Console restored');
        },

        /**
         * Actualizar estadísticas
         */
        updateStatistics: function () {
            var stats = {
                total: this.cache.allLogs.length,
                user: 0,
                system: 0,
                errors: 0
            };

            this.cache.allLogs.forEach(function (log) {
                if (log.category === 'user' || log.category === 'my') {
                    stats.user++;
                } else {
                    stats.system++;
                }

                if (log.type.toLowerCase().includes('error')) {
                    stats.errors++;
                }
            });

            this.state.statistics = stats;

            // Actualizar UI
            $('#cm-total-logs').text('Total: ' + stats.total);
            $('#cm-user-logs').text('User: ' + stats.user);
            $('#cm-system-logs').text('System: ' + stats.system);
            $('#cm-error-logs').text('Errors: ' + stats.errors);
        },

        /**
         * Configurar estado visual
         */
        setStatus: function (status) {
            this.elements.$status.removeClass('checking error').addClass(status);

            clearTimeout(this.timers.statusBlink);

            if (status === 'checking') {
                this.timers.statusBlink = setTimeout(() => {
                    this.setStatus('active');
                }, 1000);
            }
        },

        /**
         * Configurar búsqueda
         */
        setupSearch: function () {
            if (!this.config.enableSearch) return;

            var self = this;
            var $searchInput = $('<input type="text" placeholder="Buscar en logs..." class="cm-search-input">');

            this.elements.$header.find('.cm-console-controls').prepend(
                $('<div class="cm-search-container">').append($searchInput)
            );

            $searchInput.on('input.cmConsole', function () {
                var query = $(this).val();
                clearTimeout(self.timers.searchDebounce);

                self.timers.searchDebounce = setTimeout(function () {
                    self.performSearch(query);
                }, 300);
            });
        },

        /**
         * Realizar búsqueda
         */
        performSearch: function (query) {
            this.state.searchQuery = query.toLowerCase();

            if (!query) {
                this.elements.$logs.find('.console-log-item').removeClass('search-hidden search-match');
                return;
            }

            this.elements.$logs.find('.console-log-item').each(function () {
                var $log = $(this);
                var text = $log.find('.console-message').text().toLowerCase();
                var isMatch = text.includes(query);

                $log.toggleClass('search-hidden', !isMatch);
                $log.toggleClass('search-match', isMatch);
            });

            console.log('🔍 Search performed:', query);
        },

        /**
         * Configurar redimensionamiento
         */
        setupResize: function () {
            var self = this;
            var isResizing = false;
            var startPos = { x: 0, y: 0 };
            var startSize = { width: 0, height: 0 };

            this.elements.$resizer.on('mousedown.cmConsole', function (e) {
                isResizing = true;
                self.state.isResizing = true;

                startPos.x = e.clientX;
                startPos.y = e.clientY;

                var panelSize = self.elements.$panel;
                startSize.width = panelSize.width();
                startSize.height = panelSize.height();

                $(document).on('mousemove.cmConsoleResize', function (e) {
                    if (!isResizing) return;

                    var deltaX = e.clientX - startPos.x;
                    var deltaY = e.clientY - startPos.y;

                    var newWidth = Math.max(400, startSize.width + deltaX);
                    var newHeight = Math.max(300, startSize.height + deltaY);

                    self.elements.$panel.css({
                        width: newWidth + 'px',
                        height: newHeight + 'px'
                    });
                });

                $(document).on('mouseup.cmConsoleResize', function () {
                    isResizing = false;
                    self.state.isResizing = false;
                    $(document).off('.cmConsoleResize');
                });
            });
        },

        /**
         * Configurar atajos de teclado
         */
        setupKeyboardShortcuts: function () {
            var self = this;

            $(document).on('keydown.cmConsoleShortcuts', function (e) {
                if (!self.state.isVisible) return;

                // Ctrl/Cmd + F para buscar
                if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                    e.preventDefault();
                    $('.cm-search-input').focus();
                }

                // Ctrl/Cmd + L para limpiar
                if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                    e.preventDefault();
                    self.clearLogs();
                }

                // Escape para cerrar
                if (e.key === 'Escape') {
                    self.hide();
                }

                // F5 para refrescar
                if (e.key === 'F5') {
                    e.preventDefault();
                    self.refreshLogs();
                }
            });
        },

        /**
         * Iniciar drag del panel
         */
        startDrag: function (e) {
            var self = this;
            var isDragging = false;
            var startPos = { x: e.clientX, y: e.clientY };
            var panelPos = this.elements.$panel.offset();

            $(document).on('mousemove.cmConsoleDrag', function (e) {
                if (!isDragging) {
                    var distance = Math.sqrt(
                        Math.pow(e.clientX - startPos.x, 2) +
                        Math.pow(e.clientY - startPos.y, 2)
                    );

                    if (distance > 5) {
                        isDragging = true;
                        self.elements.$panel.addClass('dragging');
                    }
                }

                if (isDragging) {
                    var newLeft = panelPos.left + (e.clientX - startPos.x);
                    var newTop = panelPos.top + (e.clientY - startPos.y);

                    // Limitar a los bordes de la ventana
                    var maxLeft = $(window).width() - self.elements.$panel.width();
                    var maxTop = $(window).height() - self.elements.$panel.height();

                    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
                    newTop = Math.max(0, Math.min(newTop, maxTop));

                    self.elements.$panel.css({
                        left: newLeft + 'px',
                        top: newTop + 'px',
                        transform: 'none'
                    });
                }
            });

            $(document).on('mouseup.cmConsoleDrag', function () {
                $(document).off('.cmConsoleDrag');
                if (isDragging) {
                    self.elements.$panel.removeClass('dragging');
                }
            });
        },

        /**
         * Manejar scroll
         */
        handleScroll: function (e) {
            // Auto-scroll cuando se llega al final
            var $logs = this.elements.$logs;
            var isAtBottom = $logs.scrollTop() + $logs.innerHeight() >= $logs[0].scrollHeight - 10;

            if (isAtBottom && e.originalEvent.deltaY > 0) {
                // Ya estamos en el final y scrolleamos hacia abajo
                this.scrollToBottom();
            }
        },

        /**
         * Scroll al final
         */
        scrollToBottom: function () {
            this.elements.$logs.animate({
                scrollTop: this.elements.$logs[0].scrollHeight
            }, 300);
        },

        /**
         * Mostrar detalles de log
         */
        showLogDetails: function ($log) {
            var logData = this.extractLogData($log);

            // Crear modal de detalles
            var $modal = $('<div class="cm-log-details-modal">')
                .append('<div class="cm-modal-overlay">')
                .append(
                    $('<div class="cm-modal-content">')
                        .append('<h3>Log Details</h3>')
                        .append('<div class="cm-detail-item"><label>Type:</label><span>' + logData.type + '</span></div>')
                        .append('<div class="cm-detail-item"><label>Time:</label><span>' + logData.timestamp + '</span></div>')
                        .append('<div class="cm-detail-item"><label>Category:</label><span>' + logData.category + '</span></div>')
                        .append('<div class="cm-detail-item"><label>Message:</label><pre>' + logData.message + '</pre></div>')
                        .append(logData.source ? '<div class="cm-detail-item"><label>Source:</label><span>' + logData.source + '</span></div>' : '')
                        .append('<button class="cm-modal-close">Close</button>')
                );

            $('body').append($modal);

            // Eventos del modal
            $modal.find('.cm-modal-close, .cm-modal-overlay').on('click', function () {
                $modal.remove();
            });

            // Mostrar modal
            setTimeout(function () {
                $modal.addClass('show');
            }, 10);
        },

        /**
         * Extraer datos de un log
         */
        extractLogData: function ($log) {
            return {
                type: $log.find('.console-type').text(),
                timestamp: $log.find('.console-timestamp').text(),
                message: $log.find('.console-message').text(),
                source: $log.find('.console-source').text(),
                category: $log.data('category'),
                logType: $log.data('log-type')
            };
        },

        /**
         * Toggle selección de log
         */
        toggleLogSelection: function ($log) {
            $log.toggleClass('selected');

            var logId = $log.index();
            var selectedIndex = this.state.selectedLogs.indexOf(logId);

            if (selectedIndex > -1) {
                this.state.selectedLogs.splice(selectedIndex, 1);
            } else {
                this.state.selectedLogs.push(logId);
            }

            this.updateSelectionUI();
        },

        /**
         * Actualizar UI de selección
         */
        updateSelectionUI: function () {
            var count = this.state.selectedLogs.length;

            if (count > 0) {
                if (!$('.cm-selection-toolbar').length) {
                    var $toolbar = $('<div class="cm-selection-toolbar">')
                        .append('<span class="cm-selection-count">' + count + ' selected</span>')
                        .append('<button class="cm-export-selected">Export</button>')
                        .append('<button class="cm-delete-selected">Delete</button>')
                        .append('<button class="cm-clear-selection">Clear</button>');

                    this.elements.$footer.prepend($toolbar);

                    // Eventos de la toolbar
                    $toolbar.find('.cm-export-selected').on('click', () => this.exportSelectedLogs());
                    $toolbar.find('.cm-delete-selected').on('click', () => this.deleteSelectedLogs());
                    $toolbar.find('.cm-clear-selection').on('click', () => this.clearSelection());
                }

                $('.cm-selection-count').text(count + ' selected');
            } else {
                $('.cm-selection-toolbar').remove();
            }
        },

        /**
         * Highlight log
         */
        highlightLog: function ($log) {
            $log.addClass('highlighted');

            setTimeout(function () {
                $log.removeClass('highlighted');
            }, 2000);
        },

        /**
         * Mostrar menú contextual
         */
        showContextMenu: function ($log, e) {
            var self = this;
            var logData = this.extractLogData($log);

            // Remover menú existente
            $('.cm-context-menu').remove();

            var $menu = $('<div class="cm-context-menu">')
                .append('<div class="cm-context-item" data-action="copy">Copy Message</div>')
                .append('<div class="cm-context-item" data-action="copy-all">Copy All Data</div>')
                .append('<div class="cm-context-separator"></div>')
                .append('<div class="cm-context-item" data-action="highlight">Highlight</div>')
                .append('<div class="cm-context-item" data-action="filter">Filter by Type</div>')
                .append('<div class="cm-context-separator"></div>')
                .append('<div class="cm-context-item" data-action="details">Show Details</div>')
                .append('<div class="cm-context-item" data-action="delete">Delete</div>');

            $('body').append($menu);

            // Posicionar menú
            $menu.css({
                left: e.pageX + 'px',
                top: e.pageY + 'px'
            }).show();

            // Eventos del menú
            $menu.on('click', '.cm-context-item', function () {
                var action = $(this).data('action');
                self.handleContextAction(action, $log, logData);
                $menu.remove();
            });

            // Cerrar al hacer clic fuera
            $(document).on('click.cmContextMenu', function (e) {
                if (!$(e.target).closest('.cm-context-menu').length) {
                    $menu.remove();
                    $(document).off('.cmContextMenu');
                }
            });
        },

        /**
         * Manejar acciones del menú contextual
         */
        handleContextAction: function (action, $log, logData) {
            switch (action) {
                case 'copy':
                    this.copyToClipboard(logData.message);
                    break;
                case 'copy-all':
                    var fullData = JSON.stringify(logData, null, 2);
                    this.copyToClipboard(fullData);
                    break;
                case 'highlight':
                    this.highlightLog($log);
                    break;
                case 'filter':
                    this.setFilter(logData.category);
                    break;
                case 'details':
                    this.showLogDetails($log);
                    break;
                case 'delete':
                    this.deleteLog($log);
                    break;
            }
        },

        /**
         * Copiar al portapapeles
         */
        copyToClipboard: function (text) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(function () {
                    console.log('📋 Copied to clipboard');
                });
            } else {
                // Fallback para navegadores antiguos
                var $temp = $('<textarea>').val(text).appendTo('body').select();
                document.execCommand('copy');
                $temp.remove();
            }
        },

        /**
         * Exportar logs seleccionados
         */
        exportSelectedLogs: function () {
            var selectedData = [];
            var self = this;

            this.state.selectedLogs.forEach(function (index) {
                var $log = self.elements.$logs.find('.console-log-item').eq(index);
                if ($log.length) {
                    selectedData.push(self.extractLogData($log));
                }
            });

            this.exportLogs(selectedData, 'selected-logs');
        },

        /**
         * Exportar logs
         */
        exportLogs: function (logs, filename) {
            var data = JSON.stringify(logs, null, 2);
            var blob = new Blob([data], { type: 'application/json' });
            var url = URL.createObjectURL(blob);

            var $link = $('<a>')
                .attr('href', url)
                .attr('download', filename + '-' + new Date().toISOString().slice(0, 19) + '.json')
                .appendTo('body');

            $link[0].click();
            $link.remove();
            URL.revokeObjectURL(url);

            console.log('💾 Logs exported:', filename);
        },

        /**
         * Eliminar logs seleccionados
         */
        deleteSelectedLogs: function () {
            var self = this;

            this.state.selectedLogs.sort(function (a, b) { return b - a; }); // Mayor a menor

            this.state.selectedLogs.forEach(function (index) {
                var $log = self.elements.$logs.find('.console-log-item').eq(index);
                $log.addClass('deleting').fadeOut(300, function () {
                    $(this).remove();
                    self.cache.allLogs.splice(index, 1);
                });
            });

            this.clearSelection();
            setTimeout(() => this.updateStatistics(), 350);
        },

        /**
         * Eliminar log individual
         */
        deleteLog: function ($log) {
            var index = $log.index();

            $log.addClass('deleting').fadeOut(300, function () {
                $(this).remove();
                this.cache.allLogs.splice(index, 1);
                this.updateStatistics();
            }.bind(this));
        },

        /**
         * Limpiar selección
         */
        clearSelection: function () {
            this.state.selectedLogs = [];
            this.elements.$logs.find('.console-log-item').removeClass('selected');
            $('.cm-selection-toolbar').remove();
        },

        /**
         * Abrir configuración
         */
        openSettings: function () {
            // TODO: Implementar panel de configuración
            this.addLog('info', 'Panel de configuración (próximamente)', '', '', 'js', 'user');
        },

        /**
         * Manejar teclas
         */
        handleKeyDown: function (e) {
            // Ctrl/Cmd + A para seleccionar todo
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.selectAllLogs();
            }

            // Delete para eliminar seleccionados
            if (e.key === 'Delete' && this.state.selectedLogs.length > 0) {
                this.deleteSelectedLogs();
            }
        },

        /**
         * Seleccionar todos los logs
         */
        selectAllLogs: function () {
            var self = this;

            this.elements.$logs.find('.console-log-item:visible').each(function (index) {
                $(this).addClass('selected');
                if (self.state.selectedLogs.indexOf(index) === -1) {
                    self.state.selectedLogs.push(index);
                }
            });

            this.updateSelectionUI();
        },

        /**
         * Escapar HTML
         */
        escapeHtml: function (text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        /**
         * Guardar estado
         */
        saveState: function () {
            var state = {
                currentFilter: this.state.currentFilter,
                autoRefreshEnabled: this.state.autoRefreshEnabled,
                fileMonitorEnabled: this.state.fileMonitorEnabled,
                isMinimized: this.state.isMinimized
            };

            localStorage.setItem('cmConsoleState', JSON.stringify(state));
        },

        /**
         * Restaurar estado
         */
        restoreState: function () {
            try {
                var saved = localStorage.getItem('cmConsoleState');
                if (saved) {
                    var state = JSON.parse(saved);

                    if (state.currentFilter) {
                        this.setFilter(state.currentFilter);
                    }

                    if (state.autoRefreshEnabled) {
                        this.enableAutoRefresh();
                    }

                    if (state.fileMonitorEnabled) {
                        this.enableFileMonitor();
                    }

                    if (state.isMinimized) {
                        this.minimize();
                    }
                }
            } catch (e) {
                console.warn('Failed to restore console state:', e);
            }
        },

        /**
         * Actualizar UI
         */
        updateUI: function () {
            this.updateStatistics();
            this.applyFilter();
            this.setStatus('active');
        },

        /**
         * Refrescar (método público)
         */
        refresh: function () {
            this.refreshLogs();
            this.addLog('info', 'Console refrescado manualmente', '', '', 'js', 'user');
        },

        /**
         * Disparar evento personalizado
         */
        triggerEvent: function (eventType, data) {
            $(document).trigger('cmConsole:' + eventType, [data]);

            // También notificar al controller
            if (window.ConsoleMonitorController) {
                $(document).trigger('consoleMonitorStateChange', [{
                    isVisible: this.state.isVisible,
                    eventType: eventType,
                    data: data
                }]);
            }
        },

        /**
         * Verificar si está visible
         */
        isVisible: function () {
            return this.state.isVisible;
        },

        /**
         * Obtener estadísticas
         */
        getStatistics: function () {
            return this.state.statistics;
        },

        /**
         * Obtener logs
         */
        getLogs: function () {
            return this.cache.allLogs;
        },

        /**
         * Destruir instancia
         */
        destroy: function () {
            // Limpiar eventos
            this.elements.$panel.off('.cmConsole');
            this.elements.$filters.off('.cmConsole');
            this.elements.$actions.off('.cmConsole');
            this.elements.$logs.off('.cmConsole');
            this.elements.$header.off('.cmConsole');
            this.elements.$resizer.off('.cmConsole');
            $(document).off('.cmConsole');
            $(window).off('.cmConsole');

            // Limpiar timers
            Object.values(this.timers).forEach(timer => {
                if (timer) clearInterval(timer);
            });

            // Guardar estado final
            this.saveState();

            // Reset estado
            this.state = {
                isVisible: false,
                isMinimized: false,
                currentFilter: 'user',
                autoRefreshEnabled: false,
                fileMonitorEnabled: false,
                searchQuery: '',
                selectedLogs: [],
                lastLogId: 0,
                isResizing: false,
                logBuffer: [],
                statistics: { total: 0, user: 0, system: 0, errors: 0 }
            };

            console.log('🗑️ Console Monitor destroyed');
        }
    };

})(jQuery);