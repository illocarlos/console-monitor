/**
 * Console Monitor Pro - JavaScript TERMINAL SIMPLE
 * assets/js/cm-terminal.js
 * Sistema simplificado de terminal con filtros básicos
 * Requiere: cm-core.js, jQuery
 */

(function ($) {
    'use strict';

    // Verificar dependencia
    if (!window.ConsoleMonitor) {
        console.error('CM Terminal: ConsoleMonitor core no disponible');
        return;
    }

    // Extender estado base con datos específicos del terminal
    $.extend(window.ConsoleMonitor.state, {
        // Estados específicos del terminal
        terminalLogs: [],
        currentFilter: 'all', // 'all', 'error', 'warn', 'php', 'network', 'security'
        autoScroll: true,
        maxLogs: 100,
        logUpdateInterval: null
    });

    // Extender elementos DOM
    $.extend(window.ConsoleMonitor.elements, {
        $terminal: null,
        $logsContainer: null,
        $scrollToBottom: null
    });

    // ========================================
    // INICIALIZACIÓN DEL MÓDULO TERMINAL
    // ========================================

    // Extender la función init del core
    const originalInit = window.ConsoleMonitor.init;
    window.ConsoleMonitor.init = function () {
        originalInit.call(this);
        this.initTerminalModule();
    };

    // Extender cacheElements del core
    const originalCacheElements = window.ConsoleMonitor.cacheElements;
    window.ConsoleMonitor.cacheElements = function () {
        originalCacheElements.call(this);
        this.elements.$terminal = $('#cm-terminal');
        this.elements.$logsContainer = $('#cm-logs');
        this.elements.$scrollToBottom = $('.cm-scroll-to-bottom');
    };

    // Inicializar módulo de terminal
    window.ConsoleMonitor.initTerminalModule = function () {
        this.bindTerminalEvents();
        this.setupLogUpdates();

        console.log('🐛 Terminal module initialized');
    };

    // ========================================
    // EVENTOS ESPECÍFICOS DEL TERMINAL
    // ========================================

    window.ConsoleMonitor.bindTerminalEvents = function () {
        const self = this;

        // Escuchar apertura del panel de terminal
        $(document).on('cm:panel:opened', function (e, panelType) {
            if (panelType === 'terminal') {
                setTimeout(() => {
                    self.loadTerminalLogs();
                    self.startLogPolling();
                }, 100);
            }
        });

        // Escuchar cierre del panel de terminal
        $(document).on('cm:panel:closed', function (e, panelType) {
            if (panelType === 'terminal') {
                self.stopLogPolling();
            }
        });

        // Filtros simples
        $(document).on('click', '.cm-filter-btn', function (e) {
            e.preventDefault();
            const filterType = $(this).data('filter');
            if (filterType) {
                self.setFilter(filterType);
            }
        });

        // Botón mostrar todo
        $(document).on('click', '.cm-show-all', function (e) {
            e.preventDefault();
            self.setFilter('all');
        });

        // Botón limpiar
        $(document).on('click', '.cm-btn-clear', function (e) {
            e.preventDefault();
            if ($(this).closest('#cm-terminal').length) {
                self.clearTerminalLogs();
            }
        });

        // Scroll automático
        if (this.elements.$logsContainer.length) {
            this.elements.$logsContainer.on('scroll', function () {
                self.handleLogsScroll();
            });
        }

        // Botón scroll to bottom
        $(document).on('click', '.cm-scroll-to-bottom', function (e) {
            e.preventDefault();
            self.scrollLogsToBottom();
        });
    };

    // ========================================
    // GESTIÓN DE LOGS
    // ========================================

    // Cargar logs del terminal
    window.ConsoleMonitor.loadTerminalLogs = function () {
        const self = this;

        $.post(cmData.ajax_url, {
            action: 'cm_get_logs',
            nonce: cmData.nonce
        }, function (response) {
            if (response.success) {
                // Combinar logs de PHP y JavaScript
                const phpLogs = response.data.php_logs || [];
                const jsLogs = window.CMPro ? window.CMPro.logs || [] : [];

                // Combinar y ordenar por tiempo
                self.state.terminalLogs = [...phpLogs, ...jsLogs];
                self.renderTerminalLogs();

                console.log('🐛 Loaded', self.state.terminalLogs.length, 'terminal logs');
            } else {
                console.error('Error loading terminal logs:', response);
                self.showNotification('Error al cargar logs', 'error');
            }
        }).fail(function (xhr, status, error) {
            console.error('AJAX error loading logs:', error);
            self.showNotification('Error de conexión', 'error');
        });
    };

    // Renderizar logs del terminal
    window.ConsoleMonitor.renderTerminalLogs = function () {
        const $container = this.elements.$logsContainer;

        if (!$container.length) {
            console.warn('Logs container not found');
            return;
        }

        if (this.state.terminalLogs.length === 0) {
            $container.html(`
                <div class="cm-terminal-empty">
                    <div class="cm-terminal-empty-icon">🐛</div>
                    <div class="cm-terminal-empty-title">Terminal limpio</div>
                    <div class="cm-terminal-empty-text">
                        Los logs de JavaScript y PHP aparecerán aquí.<br>
                        Ejecuta código o navega por la web para ver actividad.
                    </div>
                </div>
            `);
            $('.cm-logs-count').text('0 logs');
            return;
        }

        // Filtrar logs según filtro activo
        let filteredLogs = this.state.terminalLogs;

        if (this.state.currentFilter !== 'all') {
            filteredLogs = this.state.terminalLogs.filter(log => {
                switch (this.state.currentFilter) {
                    case 'error':
                        return log.type === 'error' || log.type === 'php_error';
                    case 'warn':
                        return log.type === 'warn' || log.type === 'php_warning';
                    case 'php':
                        return log.type.startsWith('php');
                    case 'network':
                        return log.type === 'network' || log.message.includes('fetch') || log.message.includes('xhr');
                    case 'security':
                        return log.type === 'security' || log.message.includes('security') || log.message.includes('unauthorized');
                    default:
                        return log.type === this.state.currentFilter;
                }
            });
        }

        const logsHtml = `
            <div class="cm-terminal-filters">
                ${this.renderSimpleFilters()}
                <button class="cm-show-all ${this.state.currentFilter === 'all' ? 'active' : ''}" title="Mostrar todos los logs">
                    📋 Mostrar Todo
                </button>
            </div>
            ${filteredLogs.map(log => this.renderLogEntry(log)).join('')}
        `;
        $container.html(logsHtml);

        // Actualizar contador con detalles
        this.updateLogCounts();

        // Auto-scroll si está habilitado
        if (this.state.autoScroll) {
            this.scrollLogsToBottom();
        }
    };

    // Renderizar entrada de log individual
    window.ConsoleMonitor.renderLogEntry = function (log) {
        const typeClass = log.type || 'log';
        const time = log.time || new Date().toLocaleTimeString();
        const message = this.formatLogMessage(log.message || '');
        const source = log.source || '';

        return `
            <div class="cm-log-entry ${typeClass}" data-type="${typeClass}">
                <span class="cm-log-time">${time}</span>
                <span class="cm-log-type ${typeClass}">${typeClass.toUpperCase()}</span>
                <div class="cm-log-message">${message}</div>
                ${source ? `<span class="cm-log-source">${this.escapeHtml(source)}</span>` : ''}
            </div>
        `;
    };

    // Formatear mensaje de log
    window.ConsoleMonitor.formatLogMessage = function (message) {
        if (!message) return '';

        // Escape HTML básico
        message = this.escapeHtml(message.toString());

        // Detectar y formatear JSON
        try {
            if (message.trim().startsWith('{') || message.trim().startsWith('[')) {
                const parsed = JSON.parse(message);
                message = this.syntaxHighlightJSON(JSON.stringify(parsed, null, 2));
            }
        } catch (e) {
            // No es JSON válido, continuar con formato normal
        }

        // Detectar URLs
        message = message.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
        );

        // Formatear stack traces
        if (message.includes('    at ') || message.includes('\n')) {
            const lines = message.split('\n');
            if (lines.length > 1) {
                message = lines.map((line, index) => {
                    if (line.trim().startsWith('at ')) {
                        return `<div class="stack-trace">${line}</div>`;
                    }
                    return line;
                }).join('\n');
            }
        }

        return message;
    };

    // Syntax highlighting básico para JSON
    window.ConsoleMonitor.syntaxHighlightJSON = function (json) {
        return json
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
    };

    // Renderizar filtros simples
    window.ConsoleMonitor.renderSimpleFilters = function () {
        const logCounts = this.getLogCounts();

        const filters = [
            { key: 'error', label: 'Errores', icon: '🔴', count: (logCounts.error || 0) + (logCounts.php_error || 0) },
            { key: 'warn', label: 'Warnings', icon: '⚠️', count: (logCounts.warn || 0) + (logCounts.php_warning || 0) },
            { key: 'php', label: 'PHP', icon: '🐘', count: (logCounts.php || 0) + (logCounts.php_error || 0) + (logCounts.php_warning || 0) + (logCounts.php_notice || 0) },
            { key: 'network', label: 'Red', icon: '🌐', count: logCounts.network || 0 },
            { key: 'security', label: 'Seguridad', icon: '🔒', count: logCounts.security || 0 }
        ];

        return filters.map(filter => {
            const isActive = this.state.currentFilter === filter.key;
            const activeClass = isActive ? 'active' : '';

            return `
                <button class="cm-filter-btn ${filter.key} ${activeClass}" 
                        data-filter="${filter.key}" 
                        title="${filter.label}: ${filter.count} logs">
                    ${filter.icon} <span>${filter.label}</span>
                    ${filter.count > 0 ? `<span class="cm-filter-count">${filter.count}</span>` : ''}
                </button>
            `;
        }).join('');
    };

    // Establecer filtro específico
    window.ConsoleMonitor.setFilter = function (filterType) {
        this.state.currentFilter = filterType;
        this.renderTerminalLogs();

        console.log('🐛 Filter set to:', filterType);
    };

    // Obtener conteos de logs por tipo
    window.ConsoleMonitor.getLogCounts = function () {
        const counts = {};

        // Contar logs por tipo
        this.state.terminalLogs.forEach(log => {
            if (!counts[log.type]) {
                counts[log.type] = 0;
            }
            counts[log.type]++;
        });

        return counts;
    };

    // Actualizar contadores de logs
    window.ConsoleMonitor.updateLogCounts = function () {
        const counts = this.getLogCounts();
        const total = this.state.terminalLogs.length;
        const filtered = this.state.currentFilter === 'all' ? total :
            this.state.terminalLogs.filter(log => {
                switch (this.state.currentFilter) {
                    case 'error':
                        return log.type === 'error' || log.type === 'php_error';
                    case 'warn':
                        return log.type === 'warn' || log.type === 'php_warning';
                    case 'php':
                        return log.type.startsWith('php');
                    case 'network':
                        return log.type === 'network' || log.message.includes('fetch') || log.message.includes('xhr');
                    case 'security':
                        return log.type === 'security' || log.message.includes('security') || log.message.includes('unauthorized');
                    default:
                        return log.type === this.state.currentFilter;
                }
            }).length;

        let countText;
        if (this.state.currentFilter === 'all') {
            countText = `${total} logs`;
            if (counts.error > 0) countText += ` • <span class="count-error">${counts.error} errores</span>`;
            if (counts.warn > 0) countText += ` • <span class="count-warn">${counts.warn} warnings</span>`;
            if (counts.php_error > 0) countText += ` • <span class="count-error">${counts.php_error} PHP err</span>`;
        } else {
            const filterName = {
                error: 'Errores',
                warn: 'Warnings',
                php: 'PHP',
                network: 'Red',
                security: 'Seguridad'
            };
            countText = `${filtered} ${filterName[this.state.currentFilter] || this.state.currentFilter} de ${total} logs`;
        }

        $('.cm-logs-count').html(countText);
    };

    // Limpiar logs del terminal
    window.ConsoleMonitor.clearTerminalLogs = function () {
        const self = this;

        // Limpiar logs de JavaScript
        if (window.CMPro && window.CMPro.logs) {
            window.CMPro.logs = [];
        }

        // Limpiar logs de PHP en el servidor
        $.post(cmData.ajax_url, {
            action: 'cm_clear_logs',
            nonce: cmData.nonce
        }, function (response) {
            if (response.success) {
                self.state.terminalLogs = [];
                self.renderTerminalLogs();
                self.showNotification('Logs limpiados', 'success');
            } else {
                self.showNotification('Error al limpiar logs', 'error');
            }
        });
    };

    // ========================================
    // POLLING DE LOGS
    // ========================================

    // Configurar actualizaciones automáticas de logs
    window.ConsoleMonitor.setupLogUpdates = function () {
        // Los logs de JavaScript se actualizan automáticamente
        // Solo necesitamos polling para logs de PHP
    };

    // Iniciar polling de logs
    window.ConsoleMonitor.startLogPolling = function () {
        if (this.state.logUpdateInterval) {
            clearInterval(this.state.logUpdateInterval);
        }

        const self = this;
        this.state.logUpdateInterval = setInterval(function () {
            if (self.state.activePanel === 'terminal') {
                self.loadTerminalLogs();
            }
        }, 2000); // Actualizar cada 2 segundos

        console.log('🐛 Log polling started');
    };

    // Detener polling de logs
    window.ConsoleMonitor.stopLogPolling = function () {
        if (this.state.logUpdateInterval) {
            clearInterval(this.state.logUpdateInterval);
            this.state.logUpdateInterval = null;
        }

        console.log('🐛 Log polling stopped');
    };

    // ========================================
    // SCROLL Y NAVEGACIÓN
    // ========================================

    // Manejar scroll de logs
    window.ConsoleMonitor.handleLogsScroll = function () {
        if (!this.elements.$logsContainer.length) return;

        const $container = this.elements.$logsContainer;
        const scrollTop = $container.scrollTop();
        const scrollHeight = $container[0].scrollHeight;
        const clientHeight = $container.height();

        // Mostrar/ocultar botón scroll to bottom
        const isNearBottom = (scrollHeight - scrollTop - clientHeight) < 50;

        if (isNearBottom) {
            this.state.autoScroll = true;
            $('.cm-scroll-to-bottom').removeClass('show');
        } else {
            this.state.autoScroll = false;
            $('.cm-scroll-to-bottom').addClass('show');
        }
    };

    // Scroll automático al final
    window.ConsoleMonitor.scrollLogsToBottom = function () {
        if (!this.elements.$logsContainer.length) return;

        const $container = this.elements.$logsContainer;
        $container.animate({
            scrollTop: $container[0].scrollHeight
        }, 300);

        this.state.autoScroll = true;
        $('.cm-scroll-to-bottom').removeClass('show');
    };

    // ========================================
    // FUNCIÓN ESPECÍFICA PARA PANEL DE TERMINAL
    // ========================================

    // Función selectTerminal específica (llamada desde el core)
    window.ConsoleMonitor.selectTerminal = function () {
        console.log('🐛 Terminal panel selected');
        // La lógica de apertura ya está en el core selectPanel()
        // Aquí podemos agregar lógica específica del terminal si es necesaria
    };

    // ========================================
    // UTILIDADES DEL TERMINAL SIMPLIFICADAS
    // ========================================

    // Agregar log programáticamente
    window.ConsoleMonitor.addLogEntry = function (type, message, source = '') {
        const logEntry = {
            type: type,
            message: message,
            time: new Date().toLocaleTimeString(),
            source: source
        };

        this.state.terminalLogs.push(logEntry);

        // Mantener límite de logs
        if (this.state.terminalLogs.length > this.state.maxLogs) {
            this.state.terminalLogs = this.state.terminalLogs.slice(-80);
        }

        // Re-renderizar si el terminal está abierto
        if (this.state.activePanel === 'terminal') {
            this.renderTerminalLogs();
        }
    };

    // Exportar logs simple
    window.ConsoleMonitor.exportLogs = function (format = 'text') {
        const logs = this.state.terminalLogs;

        const textData = logs.map(log =>
            `[${log.time}] ${log.type.toUpperCase()}: ${log.message} ${log.source ? `(${log.source})` : ''}`
        ).join('\n');

        const blob = new Blob([textData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'console-logs.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Logs exportados', 'success');
    };

    // ========================================
    // DEBUGGING SIMPLE
    // ========================================

    // Debug: Simular logs de prueba
    window.ConsoleMonitor.generateTestLogs = function () {
        const testLogs = [
            { type: 'error', message: 'Error de JavaScript: función no encontrada', source: 'test.js:1' },
            { type: 'warn', message: 'Warning: variable no utilizada', source: 'test.js:2' },
            { type: 'php_error', message: 'PHP Fatal Error: Call to undefined function', source: 'test.php:10' },
            { type: 'php_warning', message: 'PHP Warning: Invalid argument supplied', source: 'test.php:15' },
            { type: 'network', message: 'Failed to fetch data from API', source: 'network' },
            { type: 'security', message: 'Unauthorized access attempt detected', source: 'security' }
        ];

        testLogs.forEach(log => {
            this.addLogEntry(log.type, log.message, log.source);
        });

        this.showNotification('Logs de prueba generados', 'info');
    };

    // ========================================
    // EVENTOS PERSONALIZADOS SIMPLES
    // ========================================

    // Escuchar eventos personalizados para logs
    $(document).on('cm:log', function (e, logData) {
        if (window.ConsoleMonitor && logData) {
            window.ConsoleMonitor.addLogEntry(
                logData.type || 'log',
                logData.message || '',
                logData.source || ''
            );
        }
    });

    // Escuchar errores de window
    window.addEventListener('unhandledrejection', function (event) {
        if (window.ConsoleMonitor) {
            window.ConsoleMonitor.addLogEntry(
                'error',
                'Unhandled Promise Rejection: ' + event.reason,
                'Promise'
            );
        }
    });

    // ========================================
    // CLEANUP
    // ========================================

    // Cleanup al cerrar
    $(window).on('beforeunload', function () {
        if (window.ConsoleMonitor && window.ConsoleMonitor.stopLogPolling) {
            window.ConsoleMonitor.stopLogPolling();
        }
    });

    console.log('🐛 Console Monitor Terminal module loaded successfully');

})(jQuery);