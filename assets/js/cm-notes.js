/**
 * Console Monitor Pro - JavaScript NOTAS COMPLETO CORREGIDO
 * assets/js/cm-notes.js  
 * Sistema completo: notas avanzadas + notas básicas + marcadores visuales
 * VERSIÓN CORREGIDA - Soluciona problemas de inicialización y eventos
 */

(function ($) {
    'use strict';

    // ========================================
    // VERIFICACIÓN DE DEPENDENCIAS CRÍTICAS
    // ========================================

    if (!window.ConsoleMonitor) {
        console.error('❌ CM Notes: ConsoleMonitor core no disponible');
        return;
    }

    if (typeof jQuery === 'undefined') {
        console.error('❌ CM Notes: jQuery no disponible');
        return;
    }

    console.log('✅ CM Notes: Dependencias verificadas');

    // ========================================
    // FUNCIÓN DE DEBUG MEJORADA
    // ========================================

    function debugConsoleMonitor() {
        console.log('🔍 ==============================================');
        console.log('🔍 DIAGNÓSTICO CONSOLE MONITOR NOTES');
        console.log('🔍 ==============================================');

        // Verificar dependencias básicas
        console.log('📦 DEPENDENCIAS:');
        console.log('  - jQuery:', typeof jQuery !== 'undefined' ? '✅' : '❌');
        console.log('  - ConsoleMonitor:', typeof window.ConsoleMonitor !== 'undefined' ? '✅' : '❌');
        console.log('  - cmData:', typeof cmData !== 'undefined' ? '✅' : '❌');

        if (typeof cmData !== 'undefined') {
            console.log('  - AJAX URL:', cmData.ajax_url || '❌');
            console.log('  - Nonce:', cmData.nonce ? '✅' : '❌');
            console.log('  - Current URL:', cmData.current_url || '❌');
        }

        // Verificar elementos DOM críticos
        console.log('\n📋 ELEMENTOS DOM:');
        console.log('  - Botón flotante:', $('#cm-floating-btn').length ? '✅' : '❌');
        console.log('  - Botón nueva nota:', $('.cm-btn-add-note').length ? '✅' : '❌');
        console.log('  - Panel notas:', $('#cm-notes').length ? '✅' : '❌');
        console.log('  - Modal notas:', $('#cm-note-modal').length ? '✅' : '❌');
        console.log('  - Container notas:', $('#cm-notes-container').length ? '✅' : '❌');
        console.log('  - Formulario notas:', $('#cm-note-form').length ? '✅' : '❌');
        console.log('  - Marcadores container:', $('#cm-markers-container').length ? '✅' : '❌');

        // Verificar widget notas básicas
        console.log('\n📝 NOTAS BÁSICAS:');
        console.log('  - Botón toggle:', $('.cm-simple-toggle-btn').length ? '✅' : '❌');
        console.log('  - Widget:', $('.cm-simple-notes-widget').length ? '✅' : '❌');
        console.log('  - Lista:', $('.cm-simple-notes-list').length ? '✅' : '❌');

        // Verificar estado
        if (window.ConsoleMonitor.state) {
            console.log('\n🔧 ESTADO:');
            console.log('  - advancedNotes:', Array.isArray(window.ConsoleMonitor.state.advancedNotes) ? '✅' : '❌');
            console.log('  - currentMarkers:', Array.isArray(window.ConsoleMonitor.state.currentMarkers) ? '✅' : '❌');
            console.log('  - markersVisible:', typeof window.ConsoleMonitor.state.markersVisible === 'boolean' ? '✅' : '❌');
        }

        console.log('🔍 ==============================================\n');
    }

    // ========================================
    // EXTENDER ESTADO BASE DE MANERA SEGURA
    // ========================================

    if (window.ConsoleMonitor.state) {
        $.extend(window.ConsoleMonitor.state, {
            // Notas avanzadas
            advancedNotes: [],
            currentEditingNote: null,
            isEditingNote: false,

            // Sistema de marcadores - FIX: Inicializar correctamente
            isMarkerSelectionMode: false,
            selectedMarker: null,
            currentMarkers: [],
            markersVisible: true,
            currentNoteType: null
        });
        console.log('✅ Estado extendido correctamente');
    } else {
        console.error('❌ window.ConsoleMonitor.state no disponible');
    }

    // Estado para notas básicas
    window.ConsoleMonitor.simpleNotes = {
        data: [],
        isVisible: false,
        selectedMarker: null
    };

    // Extender elementos DOM
    if (window.ConsoleMonitor.elements) {
        $.extend(window.ConsoleMonitor.elements, {
            $notes: null,
            $notesContainer: null,
            $noteModal: null,
            $noteForm: null,
            $markersContainer: null
        });
        console.log('✅ Elementos DOM preparados');
    }

    // ========================================
    // SOBREESCRIBIR INICIALIZACIÓN PRINCIPAL
    // ========================================

    const originalInit = window.ConsoleMonitor.init;
    window.ConsoleMonitor.init = function () {
        try {
            console.log('🚀 Iniciando ConsoleMonitor con Notes...');

            // Llamar init original
            originalInit.call(this);

            // Esperar a que DOM esté completamente listo
            $(document).ready(() => {
                setTimeout(() => {
                    try {
                        this.initNotesModule();
                        this.initSimpleNotesModule();
                        this.initMarkersSystem();

                        // Debug después de inicialización
                        setTimeout(debugConsoleMonitor, 500);

                        console.log('✅ Módulos de notas inicializados correctamente');
                    } catch (error) {
                        console.error('❌ Error en inicialización de módulos:', error);
                    }
                }, 100);
            });

        } catch (error) {
            console.error('❌ Error en init principal:', error);
        }
    };

    // ========================================
    // SOBREESCRIBIR CACHE DE ELEMENTOS
    // ========================================

    const originalCacheElements = window.ConsoleMonitor.cacheElements;
    window.ConsoleMonitor.cacheElements = function () {
        try {
            console.log('📦 Cacheando elementos...');

            // Llamar cache original
            originalCacheElements.call(this);

            // Cache elementos específicos de notas
            this.elements.$notes = $('#cm-notes');
            this.elements.$notesContainer = $('#cm-notes-container');
            this.elements.$noteModal = $('#cm-note-modal');
            this.elements.$noteForm = $('#cm-note-form');
            this.elements.$markersContainer = $('#cm-markers-container');

            // Crear contenedor de marcadores si no existe
            if (this.elements.$markersContainer.length === 0) {
                console.log('🔧 Creando contenedor de marcadores...');
                $('body').prepend('<div id="cm-markers-container" class="cm-markers-container"></div>');
                this.elements.$markersContainer = $('#cm-markers-container');
            }

            console.log('✅ Elementos cacheados:', {
                notes: this.elements.$notes.length,
                modal: this.elements.$noteModal.length,
                container: this.elements.$notesContainer.length,
                markers: this.elements.$markersContainer.length
            });

        } catch (error) {
            console.error('❌ Error cacheando elementos:', error);
        }
    };

    // ========================================
    // INICIALIZACIÓN DE MÓDULOS
    // ========================================

    // Inicializar notas avanzadas
    window.ConsoleMonitor.initNotesModule = function () {
        try {
            console.log('📝 Inicializando módulo de notas avanzadas...');
            this.bindAdvancedNotesEvents();
            console.log('✅ Módulo de notas avanzadas inicializado');
        } catch (error) {
            console.error('❌ Error inicializando notas avanzadas:', error);
        }
    };

    // Inicializar notas básicas
    window.ConsoleMonitor.initSimpleNotesModule = function () {
        try {
            console.log('📋 Inicializando módulo de notas básicas...');
            this.bindSimpleNotesEvents();
            this.loadSimpleNotesCount();
            console.log('✅ Módulo de notas básicas inicializado');
        } catch (error) {
            console.error('❌ Error inicializando notas básicas:', error);
        }
    };

    // Inicializar sistema de marcadores
    window.ConsoleMonitor.initMarkersSystem = function () {
        try {
            console.log('📍 Inicializando sistema de marcadores...');

            // Asegurar estado inicial
            if (!Array.isArray(this.state.currentMarkers)) {
                this.state.currentMarkers = [];
            }
            if (typeof this.state.markersVisible === 'undefined') {
                this.state.markersVisible = true;
            }

            this.bindMarkersEvents();

            // Cargar marcadores después de un momento
            setTimeout(() => {
                this.loadPageMarkers();
            }, 1000);

            console.log('✅ Sistema de marcadores inicializado');
        } catch (error) {
            console.error('❌ Error inicializando marcadores:', error);
        }
    };

    // ========================================
    // EVENTOS NOTAS AVANZADAS - CORREGIDOS
    // ========================================

    window.ConsoleMonitor.bindAdvancedNotesEvents = function () {
        const self = this;
        console.log('🔗 Vinculando eventos de notas avanzadas...');

        // EVENTO CRÍTICO - Botón nueva nota (múltiples selectores para compatibilidad)
        $(document).off('click.noteEvents').on('click.noteEvents', '.cm-btn-add-note, button[data-action="add-note"]', function (e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('🔥 ¡CLICK DETECTADO EN BOTÓN NUEVA NOTA!');
            console.log('Elemento clickeado:', this);
            console.log('Clases del elemento:', this.className);

            try {
                self.openNoteModal();
            } catch (error) {
                console.error('❌ Error abriendo modal:', error);
                alert('Error abriendo formulario: ' + error.message);
            }
        });

        // Evento cuando se abre el panel de notas
        $(document).off('cm:panel:opened.notes').on('cm:panel:opened.notes', function (e, panelType) {
            if (panelType === 'notes') {
                console.log('📝 Panel de notas abierto, cargando contenido...');
                setTimeout(() => {
                    self.loadAdvancedNotes();
                    self.loadPageMarkers();
                }, 100);
            }
        });

        // Botón actualizar notas
        $(document).off('click.refreshNotes').on('click.refreshNotes', '.cm-btn-refresh-notes', function (e) {
            e.preventDefault();
            console.log('🔄 Actualizando notas...');
            self.loadAdvancedNotes();
            self.loadPageMarkers();
        });

        // Botón toggle marcadores
        $(document).off('click.toggleMarkers').on('click.toggleMarkers', '.cm-btn-toggle-markers', function (e) {
            e.preventDefault();
            console.log('👁️ Toggle marcadores...');
            self.toggleMarkersVisibility();
        });

        // Cerrar modal
        $(document).off('click.closeModal').on('click.closeModal', '.cm-note-modal-close, .cm-btn-cancel', function (e) {
            e.preventDefault();
            console.log('❌ Cerrando modal...');
            self.closeNoteModal();
        });

        // Cerrar modal al hacer click fuera
        $(document).off('click.modalOverlay').on('click.modalOverlay', '#cm-note-modal', function (e) {
            if (e.target === this && !self.state.isMarkerSelectionMode) {
                console.log('❌ Cerrando modal por click fuera...');
                self.closeNoteModal();
            }
        });

        // Submit del formulario
        $(document).off('submit.noteForm').on('submit.noteForm', '#cm-note-form', function (e) {
            e.preventDefault();
            console.log('💾 Enviando formulario...');
            self.saveAdvancedNote();
        });

        // Cambiar marcador
        $(document).off('click.changeMarker').on('click.changeMarker', '.cm-btn-change-marker', function (e) {
            e.preventDefault();
            console.log('🎯 Cambiar marcador...');
            self.startMarkerSelection('advanced');
        });

        // Checklist - agregar item
        $(document).off('click.addChecklist').on('click.addChecklist', '.cm-checklist-add', function (e) {
            e.preventDefault();
            self.addChecklistItem($(this));
        });

        // Checklist - remover item
        $(document).off('click.removeChecklist').on('click.removeChecklist', '.cm-checklist-remove', function (e) {
            e.preventDefault();
            $(this).closest('.cm-checklist-item').remove();
        });

        // Enter en checklist input
        $(document).off('keypress.checklistInput').on('keypress.checklistInput', '.cm-checklist-input', function (e) {
            if (e.which === 13) {
                e.preventDefault();
                const $addBtn = $(this).siblings('.cm-checklist-add');
                if ($addBtn.length) {
                    $addBtn.click();
                }
            }
        });

        // Editar nota
        $(document).off('click.editNote').on('click.editNote', '.cm-advanced-note-edit', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = $(this).data('note-id');
            console.log('✏️ Editando nota:', noteId);
            self.editAdvancedNote(noteId);
        });

        // Eliminar nota
        $(document).off('click.deleteNote').on('click.deleteNote', '.cm-advanced-note-delete', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = $(this).data('note-id');
            if (confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
                console.log('🗑️ Eliminando nota:', noteId);
                self.deleteAdvancedNote(noteId);
            }
        });

        // Ir a marcador
        $(document).off('click.gotoMarker').on('click.gotoMarker', '.cm-advanced-note-goto', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = $(this).data('note-id');
            console.log('🎯 Ir a marcador:', noteId);
            self.goToMarker(noteId, 'advanced');
        });

        // Click en nota para ir a marcador
        $(document).off('click.noteToMarker').on('click.noteToMarker', '.cm-advanced-note.cm-note-with-marker', function (e) {
            if (!$(e.target).is('button') && !$(e.target).closest('button').length) {
                const noteId = $(this).data('note-id');
                console.log('🎯 Click en nota para ir a marcador:', noteId);
                self.goToMarker(noteId, 'advanced');
            }
        });

        // ESC para cerrar
        $(document).off('keyup.escapeKey').on('keyup.escapeKey', function (e) {
            if (e.keyCode === 27) {
                if (self.elements.$noteModal && self.elements.$noteModal.is(':visible')) {
                    self.closeNoteModal();
                } else if (self.state.isMarkerSelectionMode) {
                    self.cancelMarkerSelection();
                }
            }
        });

        console.log('✅ Eventos de notas avanzadas vinculados');
    };

    // ========================================
    // FUNCIONES PRINCIPALES NOTAS AVANZADAS
    // ========================================

    // Abrir modal - VERSIÓN CORREGIDA Y ROBUSTA
    window.ConsoleMonitor.openNoteModal = function (noteData = null) {
        try {
            console.log('📝 ================================');
            console.log('📝 ABRIENDO MODAL DE NOTA');
            console.log('📝 ================================');
            console.log('Datos de nota:', noteData);

            const $modal = $('#cm-note-modal');

            if ($modal.length === 0) {
                console.error('❌ Modal no encontrado en DOM');
                console.log('🔍 Elementos disponibles:', $('[id*="modal"], [class*="modal"]').length);
                alert('Error crítico: El modal de notas no está disponible. Verifica que el HTML se haya renderizado correctamente.');
                return;
            }

            console.log('✅ Modal encontrado, configurando...');

            // Configurar estado
            this.state.isEditingNote = !!noteData;
            this.state.currentEditingNote = noteData;

            // Configurar título del modal
            const modalTitle = noteData ? 'Editar Nota con Marcador' : 'Nueva Nota con Marcador';
            $('#cm-note-modal-title').text(modalTitle);
            console.log('✅ Título configurado:', modalTitle);

            // Limpiar formulario
            const $form = $('#cm-note-form');
            if ($form.length > 0) {
                $form[0].reset();
                console.log('✅ Formulario limpiado');
            } else {
                console.warn('⚠️ Formulario no encontrado');
            }

            // Resetear checklist
            $('#cm-checklist-container').html(`
                <div class="cm-checklist-item">
                    <input type="text" placeholder="Nueva tarea..." class="cm-checklist-input">
                    <button type="button" class="cm-checklist-add">➕</button>
                </div>
            `);
            console.log('✅ Checklist reseteado');

            // Configurar marcador
            this.state.selectedMarker = null;
            const currentUrl = window.location.href;
            $('#cm-page-url').val(currentUrl);
            console.log('✅ URL configurada:', currentUrl);

            // Si estamos editando, llenar datos
            if (noteData) {
                console.log('📝 Llenando datos de nota existente...');

                $('#cm-note-title').val(noteData.title || '');
                $('#cm-note-description').val(noteData.description || '');
                $('#cm-note-url').val(noteData.url || '');

                if (noteData.has_marker) {
                    this.state.selectedMarker = {
                        x: noteData.marker_x,
                        y: noteData.marker_y
                    };
                    $('#cm-marker-x').val(noteData.marker_x);
                    $('#cm-marker-y').val(noteData.marker_y);
                    this.showSelectedMarker(noteData.marker_x, noteData.marker_y);
                    console.log('✅ Marcador configurado:', this.state.selectedMarker);
                } else {
                    this.showMarkerInstruction();
                }

                // Llenar checklist si existe
                if (noteData.checklist && Array.isArray(noteData.checklist) && noteData.checklist.length > 0) {
                    const checklistHtml = noteData.checklist.map(item => `
                        <div class="cm-checklist-item">
                            <input type="text" value="${this.escapeHtml(item.text)}" class="cm-checklist-input" data-checked="${item.checked ? 'true' : 'false'}">
                            <button type="button" class="cm-checklist-remove">🗑️</button>
                        </div>
                    `).join('') + `
                        <div class="cm-checklist-item">
                            <input type="text" placeholder="Nueva tarea..." class="cm-checklist-input">
                            <button type="button" class="cm-checklist-add">➕</button>
                        </div>
                    `;
                    $('#cm-checklist-container').html(checklistHtml);
                    console.log('✅ Checklist llenado');
                }
            } else {
                console.log('📝 Nueva nota - mostrando instrucciones de marcador');
                this.showMarkerInstruction();
            }

            // Mostrar modal con animación
            console.log('✅ Mostrando modal...');
            $modal.fadeIn(300, function () {
                console.log('✅ Modal visible, enfocando título...');
                $('#cm-note-title').focus();
            });

            // Activar modo selección de marcador si es nueva nota
            if (!this.state.selectedMarker) {
                console.log('🎯 Activando modo selección de marcador...');
                setTimeout(() => {
                    this.startMarkerSelection('advanced');
                }, 500);
            }

            console.log('✅ Modal abierto exitosamente');

        } catch (error) {
            console.error('❌ Error crítico en openNoteModal:', error);
            console.error('Stack trace:', error.stack);
            alert('Error crítico abriendo modal: ' + error.message);
        }
    };

    // Cerrar modal
    window.ConsoleMonitor.closeNoteModal = function () {
        try {
            console.log('❌ Cerrando modal de nota...');

            const $modal = $('#cm-note-modal');
            if ($modal.length > 0) {
                $modal.fadeOut(300);
            }

            this.state.isEditingNote = false;
            this.state.currentEditingNote = null;

            // Cancelar selección de marcador
            this.cancelMarkerSelection();

            console.log('✅ Modal cerrado');
        } catch (error) {
            console.error('❌ Error cerrando modal:', error);
        }
    };

    // Mostrar instrucción de marcador
    window.ConsoleMonitor.showMarkerInstruction = function () {
        $('#cm-marker-instruction').show();
        $('#cm-marker-selected').hide();
        console.log('📍 Mostrando instrucciones de marcador');
    };

    // Mostrar marcador seleccionado
    window.ConsoleMonitor.showSelectedMarker = function (x, y, elementInfo = '') {
        $('#cm-marker-instruction').hide();
        $('#cm-marker-selected').show();
        $('#cm-marker-coordinates').text(`${x}, ${y}`);
        $('#cm-marker-element-info').text(elementInfo || 'Elemento seleccionado');
        $('#cm-marker-x').val(x);
        $('#cm-marker-y').val(y);
        console.log('✅ Marcador seleccionado mostrado:', { x, y, elementInfo });
    };

    // Agregar item a checklist
    window.ConsoleMonitor.addChecklistItem = function ($button) {
        const $input = $button.siblings('.cm-checklist-input');
        const text = $input.val().trim();

        if (!text) {
            alert('Por favor escribe una tarea');
            $input.focus();
            return;
        }

        const newItemHtml = `
            <div class="cm-checklist-item">
                <input type="text" value="${this.escapeHtml(text)}" class="cm-checklist-input" data-checked="false">
                <button type="button" class="cm-checklist-remove">🗑️</button>
            </div>
        `;

        $button.closest('.cm-checklist-item').before(newItemHtml);
        $input.val('').focus();
        console.log('✅ Item de checklist agregado:', text);
    };

    // Cargar notas avanzadas
    window.ConsoleMonitor.loadAdvancedNotes = function () {
        const self = this;

        console.log('📥 ================================');
        console.log('📥 CARGANDO NOTAS AVANZADAS');
        console.log('📥 ================================');

        if (typeof cmData === 'undefined') {
            console.error('❌ cmData no disponible');
            this.showAdvancedNotesError('Error: Configuración no disponible (cmData)');
            return;
        }

        if (!cmData.ajax_url) {
            console.error('❌ AJAX URL no disponible');
            this.showAdvancedNotesError('Error: URL AJAX no configurada');
            return;
        }

        if (!cmData.nonce) {
            console.error('❌ Nonce no disponible');
            this.showAdvancedNotesError('Error: Token de seguridad no disponible');
            return;
        }

        console.log('✅ Configuración verificada, enviando petición...');
        console.log('AJAX URL:', cmData.ajax_url);
        console.log('Nonce:', cmData.nonce);

        $.post(cmData.ajax_url, {
            action: 'cm_get_notes',
            nonce: cmData.nonce
        })
            .done(function (response) {
                console.log('📥 Respuesta recibida:', response);

                if (response && response.success) {
                    self.state.advancedNotes = response.data.notes || [];
                    self.renderAdvancedNotes();
                    self.updateAdvancedNotesCount();
                    console.log('✅ Notas cargadas exitosamente:', self.state.advancedNotes.length);
                } else {
                    console.error('❌ Error en respuesta del servidor:', response);
                    const errorMsg = (response && response.data) ? response.data : 'Error desconocido del servidor';
                    self.showAdvancedNotesError('Error del servidor: ' + errorMsg);
                }
            })
            .fail(function (xhr, status, error) {
                console.error('❌ Error AJAX:', { xhr, status, error });
                console.error('Response text:', xhr.responseText);
                self.showAdvancedNotesError('Error de conexión: ' + error + ' (Status: ' + status + ')');
            });
    };

    // Renderizar notas avanzadas
    window.ConsoleMonitor.renderAdvancedNotes = function () {
        const $container = $('#cm-notes-container');

        if (!$container.length) {
            console.error('❌ Contenedor de notas no encontrado');
            return;
        }

        console.log('🎨 Renderizando', this.state.advancedNotes.length, 'notas avanzadas');

        if (this.state.advancedNotes.length === 0) {
            $container.html(`
                <div class="cm-notes-empty">
                    <div class="cm-notes-empty-icon">📍</div>
                    <div class="cm-notes-empty-title">No hay notas con marcadores</div>
                    <div class="cm-notes-empty-text">
                        Crea tu primera nota marcando un punto en la página.<br>
                        Haz clic en "Nueva" para empezar.
                    </div>
                </div>
            `);
            return;
        }

        const html = this.state.advancedNotes.map(note => this.renderAdvancedNoteItem(note)).join('');
        $container.html(html);
        console.log('✅ Notas renderizadas');
    };

    // Renderizar item individual de nota avanzada
    window.ConsoleMonitor.renderAdvancedNoteItem = function (note) {
        const checklistHtml = (note.checklist && note.checklist.length > 0) ?
            `<ul class="cm-advanced-note-checklist">
                ${note.checklist.map(item => `
                    <li>
                        <input type="checkbox" ${item.checked ? 'checked' : ''} disabled>
                        <span>${this.escapeHtml(item.text)}</span>
                    </li>
                `).join('')}
            </ul>` : '';

        const urlHtml = note.url ?
            `<a href="${note.url}" target="_blank" class="cm-advanced-note-url">🔗 ${note.url}</a>` : '';

        const markerInfo = note.has_marker ?
            `<div class="cm-advanced-note-marker-info">📍 Marcado en (${note.marker_x}, ${note.marker_y})</div>` : '';

        const noteClasses = ['cm-advanced-note'];
        if (note.has_marker) {
            noteClasses.push('cm-note-with-marker');
        }

        return `
            <div class="${noteClasses.join(' ')}" data-note-id="${note.id}">
                <div class="cm-advanced-note-header">
                    <h4 class="cm-advanced-note-title">${this.escapeHtml(note.title)}</h4>
                    <div class="cm-advanced-note-actions">
                        ${note.has_marker ? `<button class="cm-advanced-note-goto" data-note-id="${note.id}" title="Ir al marcador">🎯</button>` : ''}
                        <button class="cm-advanced-note-edit" data-note-id="${note.id}" title="Editar">✏️</button>
                        <button class="cm-advanced-note-delete" data-note-id="${note.id}" title="Eliminar">🗑️</button>
                    </div>
                </div>
                
                ${note.description ? `<div class="cm-advanced-note-description">${this.escapeHtml(note.description)}</div>` : ''}
                ${urlHtml}
                ${checklistHtml}
                ${markerInfo}
                
                <div class="cm-advanced-note-meta">
                    Creada: ${note.created_at} • Actualizada: ${note.updated_at}
                </div>
            </div>
        `;
    };

    // Guardar nota avanzada
    window.ConsoleMonitor.saveAdvancedNote = function () {
        const self = this;

        console.log('💾 ================================');
        console.log('💾 GUARDANDO NOTA AVANZADA');
        console.log('💾 ================================');

        // Recopilar datos del formulario
        const title = $('#cm-note-title').val().trim();
        const description = $('#cm-note-description').val().trim();
        const url = $('#cm-note-url').val().trim();
        const marker_x = parseInt($('#cm-marker-x').val()) || 0;
        const marker_y = parseInt($('#cm-marker-y').val()) || 0;
        const page_url = $('#cm-page-url').val();

        console.log('📋 Datos del formulario:', {
            title,
            description,
            url,
            marker_x,
            marker_y,
            page_url
        });

        // Validar datos requeridos
        if (!title) {
            alert('El título es requerido');
            $('#cm-note-title').focus();
            return;
        }

        if (!marker_x || !marker_y) {
            alert('Debes marcar un punto en la página');
            this.startMarkerSelection('advanced');
            return;
        }

        // Recopilar checklist
        const checklist = [];
        $('#cm-checklist-container .cm-checklist-item').each(function () {
            const $input = $(this).find('.cm-checklist-input');
            const text = $input.val().trim();
            const checked = $input.data('checked') === 'true' || $input.data('checked') === true;

            if (text && !$(this).find('.cm-checklist-add').length) {
                checklist.push({
                    text: text,
                    checked: checked
                });
            }
        });

        console.log('📋 Checklist recopilado:', checklist);

        // Preparar datos para envío
        const noteData = {
            title: title,
            description: description,
            url: url,
            checklist: JSON.stringify(checklist),
            marker_x: marker_x,
            marker_y: marker_y,
            page_url: page_url
        };

        // Si estamos editando, agregar ID
        if (this.state.isEditingNote && this.state.currentEditingNote) {
            noteData.note_id = this.state.currentEditingNote.id;
            console.log('✏️ Editando nota ID:', noteData.note_id);
        }

        // Mostrar estado de carga
        const $saveBtn = $('.cm-btn-save');
        const originalText = $saveBtn.text();
        $saveBtn.text('Guardando...').prop('disabled', true);

        // Determinar acción AJAX
        const action = this.state.isEditingNote ? 'cm_update_note' : 'cm_save_note';
        console.log('🚀 Enviando acción:', action);

        // Verificar configuración AJAX
        if (typeof cmData === 'undefined') {
            console.error('❌ cmData no disponible');
            alert('Error: Configuración no disponible');
            $saveBtn.text(originalText).prop('disabled', false);
            return;
        }

        // Enviar datos
        $.post(cmData.ajax_url, {
            action: action,
            nonce: cmData.nonce,
            ...noteData
        })
            .done(function (response) {
                console.log('💾 Respuesta del servidor:', response);

                if (response && response.success) {
                    console.log('✅ Nota guardada exitosamente');
                    self.closeNoteModal();
                    self.loadAdvancedNotes();
                    self.loadPageMarkers();
                    self.showNotification(response.data.message || 'Nota guardada exitosamente', 'success');
                } else {
                    console.error('❌ Error del servidor:', response);
                    const errorMsg = (response && response.data) ? response.data : 'Error desconocido del servidor';
                    alert('❌ Error: ' + errorMsg);
                }
            })
            .fail(function (xhr, status, error) {
                console.error('❌ Error AJAX guardando:', { xhr, status, error });
                console.error('Response text:', xhr.responseText);
                alert('Error de conexión al guardar: ' + error);
            })
            .always(function () {
                $saveBtn.text(originalText).prop('disabled', false);
            });
    };

    // Editar nota avanzada
    window.ConsoleMonitor.editAdvancedNote = function (noteId) {
        const note = this.state.advancedNotes.find(n => n.id == noteId);
        if (!note) {
            alert('Nota no encontrada');
            return;
        }

        console.log('✏️ Editando nota:', note);
        this.openNoteModal(note);
    };

    // Eliminar nota avanzada
    window.ConsoleMonitor.deleteAdvancedNote = function (noteId) {
        const self = this;

        console.log('🗑️ Eliminando nota ID:', noteId);

        if (typeof cmData === 'undefined') {
            alert('Error: Configuración no disponible');
            return;
        }

        $.post(cmData.ajax_url, {
            action: 'cm_delete_note',
            nonce: cmData.nonce,
            note_id: noteId
        })
            .done(function (response) {
                console.log('🗑️ Respuesta eliminar:', response);

                if (response && response.success) {
                    self.loadAdvancedNotes();
                    self.loadPageMarkers();
                    self.showNotification(response.data.message || 'Nota eliminada', 'success');
                } else {
                    console.error('❌ Error eliminando:', response);
                    const errorMsg = (response && response.data) ? response.data : 'Error desconocido';
                    alert('❌ Error: ' + errorMsg);
                }
            })
            .fail(function (xhr, status, error) {
                console.error('❌ Error AJAX eliminando:', { xhr, status, error });
                alert('Error de conexión al eliminar: ' + error);
            });
    };

    // Actualizar contador de notas avanzadas
    window.ConsoleMonitor.updateAdvancedNotesCount = function () {
        const count = this.state.advancedNotes.length;
        const markersCount = this.state.advancedNotes.filter(n => n.has_marker).length;
        $('#cm-notes .cm-notes-count').text(`${count} notas (${markersCount} marcadas)`);
        console.log('📊 Contador actualizado:', count, 'marcadores:', markersCount);
    };

    // Mostrar error en notas avanzadas
    window.ConsoleMonitor.showAdvancedNotesError = function (message) {
        const $container = $('#cm-notes-container');
        if ($container.length) {
            $container.html(`
                <div class="cm-notes-empty">
                    <div class="cm-notes-empty-icon" style="color: #e74c3c;">❌</div>
                    <div class="cm-notes-empty-title" style="color: #e74c3c;">Error</div>
                    <div class="cm-notes-empty-text">${message}</div>
                </div>
            `);
        }
        console.error('❌ Error mostrado:', message);
    };

    // ========================================
    // EVENTOS NOTAS BÁSICAS
    // ========================================

    window.ConsoleMonitor.bindSimpleNotesEvents = function () {
        const self = this;
        console.log('🔗 Vinculando eventos de notas básicas...');

        // Toggle panel de notas básicas
        $(document).off('click.simpleToggle').on('click.simpleToggle', '.cm-simple-toggle-btn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('📋 Toggle notas básicas');

            const $widget = $('.cm-simple-notes-widget');
            if ($widget.is(':visible')) {
                $widget.hide();
                self.simpleNotes.isVisible = false;
                self.cancelMarkerSelection();
            } else {
                $widget.show();
                self.simpleNotes.isVisible = true;
                self.loadSimpleNotes();
                if (!self.simpleNotes.selectedMarker) {
                    setTimeout(() => {
                        self.startMarkerSelection('simple');
                    }, 300);
                }
            }
        });

        // Cerrar panel de notas básicas
        $(document).off('click.simpleClose').on('click.simpleClose', '.cm-simple-btn-close', function (e) {
            e.preventDefault();
            $('.cm-simple-notes-widget').hide();
            self.simpleNotes.isVisible = false;
            self.cancelMarkerSelection();
        });

        // Cambiar marcador en notas básicas
        $(document).off('click.simpleChangeMarker').on('click.simpleChangeMarker', '.cm-simple-btn-change-marker', function (e) {
            e.preventDefault();
            self.startMarkerSelection('simple');
        });

        // Agregar nota básica
        $(document).off('click.simpleAdd').on('click.simpleAdd', '.cm-simple-btn-add', function (e) {
            e.preventDefault();

            const text = $('.cm-simple-note-input').val().trim();
            if (!text) {
                alert('Por favor escribe una nota');
                $('.cm-simple-note-input').focus();
                return;
            }

            if (!self.simpleNotes.selectedMarker) {
                alert('Debes marcar un punto en la página');
                self.startMarkerSelection('simple');
                return;
            }

            self.saveSimpleNote(text);
        });

        // Enter para agregar nota básica
        $(document).off('keypress.simpleInput').on('keypress.simpleInput', '.cm-simple-note-input', function (e) {
            if (e.which === 13) {
                e.preventDefault();
                $('.cm-simple-btn-add').click();
            }
        });

        // Eliminar nota básica
        $(document).off('click.simpleDelete').on('click.simpleDelete', '.cm-simple-note-delete', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (!confirm('¿Eliminar esta nota rápida?')) return;

            const noteId = $(this).data('note-id');
            if (noteId) {
                self.deleteSimpleNote(noteId);
            }
        });

        // Click en nota básica para ir a marcador
        $(document).off('click.simpleToMarker').on('click.simpleToMarker', '.cm-simple-note-item.cm-simple-note-with-marker', function (e) {
            if (!$(e.target).is('.cm-simple-note-delete') && !$(e.target).closest('.cm-simple-note-delete').length) {
                const noteId = $(this).data('note-id');
                self.goToMarker(noteId, 'simple');
            }
        });

        // Cerrar al hacer click fuera
        $(document).off('click.simpleOutside').on('click.simpleOutside', function (e) {
            if (self.state.isMarkerSelectionMode) return;

            if (self.simpleNotes.isVisible &&
                !$(e.target).closest('.cm-simple-notes-widget, .cm-simple-toggle-btn, .cm-floating-container, .cm-panel, .cm-note-modal').length) {
                $('.cm-simple-notes-widget').hide();
                self.simpleNotes.isVisible = false;
                self.cancelMarkerSelection();
            }
        });

        console.log('✅ Eventos de notas básicas vinculados');
    };

    // ========================================
    // FUNCIONES NOTAS BÁSICAS
    // ========================================

    // Cargar notas básicas
    window.ConsoleMonitor.loadSimpleNotes = function () {
        const self = this;

        console.log('📥 Cargando notas básicas...');

        if (typeof cmData === 'undefined') {
            console.error('❌ cmData no disponible para notas básicas');
            alert('Error: Configuración no disponible');
            return;
        }

        $.post(cmData.ajax_url, {
            action: 'cm_get_simple_notes',
            nonce: cmData.nonce
        })
            .done(function (response) {
                console.log('📥 Respuesta notas básicas:', response);

                if (response && response.success) {
                    self.simpleNotes.data = response.data.notes || [];
                    self.renderSimpleNotes();
                    self.updateSimpleNotesCount();
                } else {
                    console.error('❌ Error cargando notas básicas:', response);
                    alert('Error al cargar notas: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('❌ Error AJAX notas básicas:', { xhr, status, error });
                alert('Error de conexión al cargar notas básicas');
            });
    };

    // Guardar nota básica
    window.ConsoleMonitor.saveSimpleNote = function (text) {
        const self = this;

        console.log('💾 Guardando nota básica:', text);

        if (!this.simpleNotes.selectedMarker) {
            alert('Debes marcar un punto en la página');
            return;
        }

        $.post(cmData.ajax_url, {
            action: 'cm_save_simple_note',
            nonce: cmData.nonce,
            note_text: text,
            marker_x: this.simpleNotes.selectedMarker.x,
            marker_y: this.simpleNotes.selectedMarker.y,
            page_url: window.location.href
        })
            .done(function (response) {
                console.log('💾 Nota básica guardada:', response);

                if (response && response.success) {
                    $('.cm-simple-note-input').val('');
                    self.loadSimpleNotes();
                    self.loadPageMarkers();

                    const $btn = $('.cm-simple-btn-add');
                    const originalText = $btn.text();
                    $btn.text('✅ Guardada').prop('disabled', true);
                    setTimeout(() => {
                        $btn.text(originalText).prop('disabled', false);
                    }, 1000);

                    self.simpleNotes.selectedMarker = null;
                    self.updateSimpleMarkerDisplay();

                } else {
                    console.error('❌ Error guardando nota básica:', response);
                    alert('❌ Error: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('❌ Error AJAX guardando nota básica:', { xhr, status, error });
                alert('Error de conexión al guardar nota básica');
            });
    };

    // Eliminar nota básica
    window.ConsoleMonitor.deleteSimpleNote = function (noteId) {
        const self = this;

        console.log('🗑️ Eliminando nota básica:', noteId);

        $.post(cmData.ajax_url, {
            action: 'cm_delete_simple_note',
            nonce: cmData.nonce,
            note_id: noteId
        })
            .done(function (response) {
                console.log('🗑️ Nota básica eliminada:', response);

                if (response && response.success) {
                    self.loadSimpleNotes();
                    self.loadPageMarkers();
                } else {
                    console.error('❌ Error eliminando nota básica:', response);
                    alert('❌ Error: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('❌ Error AJAX eliminando nota básica:', { xhr, status, error });
                alert('Error de conexión al eliminar nota básica');
            });
    };

    // Renderizar lista de notas básicas
    window.ConsoleMonitor.renderSimpleNotes = function () {
        const $list = $('.cm-simple-notes-list');

        if (!$list.length) {
            console.warn('❌ Lista de notas básicas no encontrada');
            return;
        }

        console.log('🎨 Renderizando', this.simpleNotes.data.length, 'notas básicas');

        if (this.simpleNotes.data.length === 0) {
            $list.html(`
                <div class="cm-simple-notes-empty">
                    <div style="font-size: 32px; margin-bottom: 10px;">📍</div>
                    <div style="font-weight: bold; margin-bottom: 5px;">No hay notas marcadas aún</div>
                    <div style="font-size: 11px; opacity: 0.8;">Escribe una nota y marca un punto en la página</div>
                </div>
            `);
            return;
        }

        const html = this.simpleNotes.data.map(note => {
            const noteClasses = ['cm-simple-note-item'];
            if (note.has_marker) {
                noteClasses.push('cm-simple-note-with-marker');
            }

            const markerInfo = note.has_marker ?
                `<div class="cm-simple-note-marker-info">📍 (${note.marker_x}, ${note.marker_y})</div>` : '';

            return `
                <div class="${noteClasses.join(' ')}" data-note-id="${note.id}">
                    <div class="cm-simple-note-text">${this.escapeHtml(note.text)}</div>
                    ${markerInfo}
                    <button class="cm-simple-note-delete" data-note-id="${note.id}" title="Eliminar">🗑</button>
                </div>
            `;
        }).join('');

        $list.html(html);
    };

    // Actualizar contador de notas básicas
    window.ConsoleMonitor.updateSimpleNotesCount = function () {
        const count = this.simpleNotes.data.length;
        const $counter = $('.cm-simple-notes-count');

        if (count > 0) {
            $counter.text(count).show();
        } else {
            $counter.hide();
        }

        console.log('📊 Contador notas básicas:', count);
    };

    // Actualizar display del marcador en notas básicas
    window.ConsoleMonitor.updateSimpleMarkerDisplay = function () {
        const $instruction = $('.cm-simple-marker-instruction');
        const $selected = $('#cm-simple-marker-selected');

        if (this.simpleNotes.selectedMarker) {
            $instruction.hide();
            $selected.show();
            $('#cm-simple-coordinates').text(`${this.simpleNotes.selectedMarker.x}, ${this.simpleNotes.selectedMarker.y}`);
        } else {
            $instruction.show();
            $selected.hide();
        }
    };

    // Cargar solo el contador
    window.ConsoleMonitor.loadSimpleNotesCount = function () {
        const self = this;

        $.post(cmData.ajax_url, {
            action: 'cm_get_simple_notes',
            nonce: cmData.nonce
        })
            .done(function (response) {
                if (response && response.success) {
                    self.simpleNotes.data = response.data.notes || [];
                    self.updateSimpleNotesCount();
                }
            })
            .fail(function () {
                console.log('📊 Error cargando contador básico (silenciado)');
            });
    };

    // ========================================
    // SISTEMA DE MARCADORES VISUALES
    // ========================================

    window.ConsoleMonitor.bindMarkersEvents = function () {
        const self = this;
        console.log('🔗 Vinculando eventos de marcadores...');

        // Click en marcador visual
        $(document).off('click.marker').on('click.marker', '.cm-marker', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const markerId = $(this).data('marker-id');
            const markerType = $(this).data('marker-type');

            if (markerId && markerType) {
                self.goToMarker(markerId, markerType);
                self.highlightMarker($(this));
            }
        });

        console.log('✅ Eventos de marcadores vinculados');
    };

    // Bindear eventos de selección de marcador
    window.ConsoleMonitor.bindMarkerSelectionEvents = function () {
        const self = this;

        console.log('🎯 Binding eventos de selección de marcador');

        // Click para seleccionar marcador
        $(document).off('click.markerSelection').on('click.markerSelection', function (e) {
            if (self.state.isMarkerSelectionMode) {
                // Excluir elementos de interfaz
                if ($(e.target).closest('.cm-note-modal, .cm-simple-notes-widget, .cm-floating-container, .cm-panel, .cm-marker-selection-indicator').length) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();

                const x = e.pageX;
                const y = e.pageY;
                const element = e.target;
                const elementInfo = self.getElementInfo(element);

                self.setSelectedMarker(x, y, elementInfo);
            }
        });

        // Prevenir default en modo selección
        $(document).off('mousedown.markerSelection').on('mousedown.markerSelection', function (e) {
            if (self.state.isMarkerSelectionMode) {
                if (!$(e.target).closest('.cm-note-modal, .cm-simple-notes-widget, .cm-floating-container, .cm-panel').length) {
                    e.preventDefault();
                }
            }
        });
    };

    // Cargar marcadores de la página
    window.ConsoleMonitor.loadPageMarkers = function () {
        const self = this;

        console.log('📍 Cargando marcadores de la página...');

        if (typeof cmData === 'undefined') {
            console.warn('❌ cmData no disponible para marcadores');
            return;
        }

        // Verificar estado
        this.verifyAndRepairState();

        $.post(cmData.ajax_url, {
            action: 'cm_get_page_markers',
            nonce: cmData.nonce
        })
            .done(function (response) {
                console.log('📍 Respuesta marcadores:', response);

                if (response && response.success && response.data) {
                    const markers = response.data.markers || [];

                    if (Array.isArray(markers)) {
                        self.state.currentMarkers = markers.filter(marker => self.validateMarker(marker));
                    } else {
                        console.warn('❌ Markers no es un array:', markers);
                        self.state.currentMarkers = [];
                    }
                } else {
                    console.error('❌ Error cargando marcadores:', response);
                    self.state.currentMarkers = [];
                }

                self.renderPageMarkers();
            })
            .fail(function (xhr, status, error) {
                console.error('❌ Error AJAX cargando marcadores:', { xhr, status, error });
                self.state.currentMarkers = [];
                self.renderPageMarkers();
            });
    };

    // Renderizar marcadores en la página
    window.ConsoleMonitor.renderPageMarkers = function () {
        const $container = this.elements.$markersContainer;

        if (!$container || !$container.length) {
            console.warn('❌ Contenedor de marcadores no encontrado');
            return;
        }

        if (!this.state.currentMarkers) {
            this.state.currentMarkers = [];
        }

        if (!Array.isArray(this.state.currentMarkers)) {
            console.warn('❌ currentMarkers no es un array:', this.state.currentMarkers);
            this.state.currentMarkers = [];
            return;
        }

        console.log('📍 Renderizando', this.state.currentMarkers.length, 'marcadores');

        $container.empty();

        if (!this.state.markersVisible) {
            return;
        }

        this.state.currentMarkers.forEach((marker, index) => {
            if (!marker || typeof marker !== 'object') {
                console.warn('❌ Marcador inválido:', marker);
                return;
            }

            const markerHtml = `
                <div class="cm-marker cm-marker-${marker.type || 'default'} cm-marker-fade-in" 
                     data-marker-id="${marker.id || 0}" 
                     data-marker-type="${marker.type || 'default'}"
                     style="left: ${marker.x || 0}px; top: ${marker.y || 0}px;">
                    ${marker.type === 'advanced' ? '📝' : '📋'}
                    <div class="cm-marker-tooltip">
                        ${this.escapeHtml(marker.title || 'Sin título')}
                    </div>
                </div>
            `;
            $container.append(markerHtml);
        });

        $('.cm-marker').each(function (index) {
            $(this).css('animation-delay', (index * 0.1) + 's');
        });
    };

    // Iniciar selección de marcador
    window.ConsoleMonitor.startMarkerSelection = function (noteType) {
        console.log('🎯 Iniciando selección de marcador para:', noteType);

        this.state.isMarkerSelectionMode = true;
        this.state.currentNoteType = noteType;

        this.bindMarkerSelectionEvents();

        $('body').addClass('cm-marker-selection-mode');

        $('body').append(`
            <div class="cm-marker-selection-overlay"></div>
            <div class="cm-marker-selection-indicator">
                🎯 Haz clic en cualquier elemento para marcarlo
            </div>
        `);

        $('.cm-marker').hide();

        console.log('✅ Modo selección activado');
    };

    // Cancelar selección de marcador
    window.ConsoleMonitor.cancelMarkerSelection = function () {
        if (!this.state.isMarkerSelectionMode) return;

        console.log('❌ Cancelando selección de marcador');

        this.state.isMarkerSelectionMode = false;
        this.state.currentNoteType = null;

        $(document).off('click.markerSelection');
        $(document).off('mousedown.markerSelection');

        $('body').removeClass('cm-marker-selection-mode');
        $('.cm-marker-selection-overlay').remove();
        $('.cm-marker-selection-indicator').remove();

        $('.cm-marker').show();
    };

    // Establecer marcador seleccionado
    window.ConsoleMonitor.setSelectedMarker = function (x, y, elementInfo) {
        console.log('✅ Marcador seleccionado:', x, y, elementInfo);

        this.cancelMarkerSelection();

        if (this.state.currentNoteType === 'advanced') {
            this.state.selectedMarker = { x, y };
            this.showSelectedMarker(x, y, elementInfo);
            setTimeout(() => {
                $('#cm-note-title').focus();
            }, 300);
        } else if (this.state.currentNoteType === 'simple') {
            this.simpleNotes.selectedMarker = { x, y };
            this.updateSimpleMarkerDisplay();
            setTimeout(() => {
                $('.cm-simple-note-input').focus();
            }, 300);
        }

        this.showTemporaryMarker(x, y);
    };

    // Mostrar marcador temporal
    window.ConsoleMonitor.showTemporaryMarker = function (x, y) {
        $('.cm-temp-marker').remove();

        const tempMarker = `
            <div class="cm-marker cm-temp-marker cm-marker-pulse" 
                 style="left: ${x}px; top: ${y}px; background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);">
                🎯
                <div class="cm-marker-tooltip">Nuevo marcador</div>
            </div>
        `;

        this.elements.$markersContainer.append(tempMarker);

        setTimeout(() => {
            $('.cm-temp-marker').addClass('cm-marker-fade-out');
            setTimeout(() => {
                $('.cm-temp-marker').remove();
            }, 300);
        }, 3000);
    };

    // Ir a marcador
    window.ConsoleMonitor.goToMarker = function (noteId, noteType) {
        console.log('🎯 Navegando a marcador:', noteId, noteType);

        let marker = null;

        if (noteType === 'advanced') {
            const note = this.state.advancedNotes.find(n => n.id == noteId);
            if (note && note.has_marker) {
                marker = { x: note.marker_x, y: note.marker_y, title: note.title };
            }
        } else if (noteType === 'simple') {
            const note = this.simpleNotes.data.find(n => n.id == noteId);
            if (note && note.has_marker) {
                marker = { x: note.marker_x, y: note.marker_y, title: note.text };
            }
        }

        if (!marker) {
            alert('Marcador no encontrado');
            return;
        }

        $('html, body').animate({
            scrollTop: marker.y - 100,
            scrollLeft: marker.x - 100
        }, 800);

        setTimeout(() => {
            const $visualMarker = $(`.cm-marker[data-marker-id="${noteId}"][data-marker-type="${noteType}"]`);
            if ($visualMarker.length) {
                this.highlightMarker($visualMarker);
            }
        }, 900);

        this.showNotification(`Navegando a: ${marker.title}`, 'info', 2000);
    };

    // Destacar marcador
    window.ConsoleMonitor.highlightMarker = function ($marker) {
        $('.cm-marker').removeClass('cm-marker-highlight');
        $marker.addClass('cm-marker-highlight');

        setTimeout(() => {
            $marker.removeClass('cm-marker-highlight');
        }, 1000);
    };

    // Toggle visibilidad de marcadores
    window.ConsoleMonitor.toggleMarkersVisibility = function () {
        this.state.markersVisible = !this.state.markersVisible;

        const $toggleBtn = $('.cm-btn-toggle-markers');

        if (this.state.markersVisible) {
            this.renderPageMarkers();
            $toggleBtn.removeClass('active').attr('title', 'Ocultar Marcadores');
            this.showNotification('Marcadores visibles', 'info', 1500);
        } else {
            this.elements.$markersContainer.empty();
            $toggleBtn.addClass('active').attr('title', 'Mostrar Marcadores');
            this.showNotification('Marcadores ocultos', 'info', 1500);
        }

        console.log('👁️ Marcadores', this.state.markersVisible ? 'visibles' : 'ocultos');
    };

    // Obtener información del elemento
    window.ConsoleMonitor.getElementInfo = function (element) {
        let info = element.tagName.toLowerCase();

        if (element.id) {
            info += `#${element.id}`;
        }

        if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ').filter(c => c.trim());
            if (classes.length > 0) {
                info += `.${classes.slice(0, 2).join('.')}`;
                if (classes.length > 2) info += '...';
            }
        }

        const text = $(element).text().trim();
        if (text && text.length < 30) {
            info += ` "${text}"`;
        }

        return info;
    };

    // ========================================
    // FUNCIONES DE VALIDACIÓN Y UTILIDADES
    // ========================================

    // Validar marcador
    window.ConsoleMonitor.validateMarker = function (marker) {
        if (!marker || typeof marker !== 'object') {
            return false;
        }

        return (
            typeof marker.id !== 'undefined' &&
            typeof marker.type === 'string' &&
            typeof marker.x === 'number' &&
            typeof marker.y === 'number' &&
            typeof marker.title === 'string'
        );
    };

    // Verificar y reparar estado
    window.ConsoleMonitor.verifyAndRepairState = function () {
        let repaired = false;

        if (!Array.isArray(this.state.currentMarkers)) {
            console.warn('🔧 Reparando currentMarkers...');
            this.state.currentMarkers = [];
            repaired = true;
        }

        if (typeof this.state.markersVisible !== 'boolean') {
            console.warn('🔧 Reparando markersVisible...');
            this.state.markersVisible = true;
            repaired = true;
        }

        if (!this.elements.$markersContainer || this.elements.$markersContainer.length === 0) {
            console.warn('🔧 Reparando contenedor de marcadores...');
            if ($('#cm-markers-container').length === 0) {
                $('body').prepend('<div id="cm-markers-container" class="cm-markers-container"></div>');
            }
            this.elements.$markersContainer = $('#cm-markers-container');
            repaired = true;
        }

        if (repaired) {
            console.log('🔧 Estado reparado exitosamente');
        }

        return !repaired;
    };

    // Función de escape HTML
    window.ConsoleMonitor.escapeHtml = function (text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // Mostrar notificación
    window.ConsoleMonitor.showNotification = function (message, type = 'info', duration = 3000) {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            info: '#3498db',
            warning: '#f39c12'
        };

        const notification = $(`
            <div class="cm-notification" style="background: ${colors[type]}; position: fixed; top: 20px; right: 20px; color: white; padding: 12px 20px; border-radius: 6px; z-index: 99999; transform: translateX(100%); transition: transform 0.3s ease;">
                ${message}
            </div>
        `);

        $('body').append(notification);

        setTimeout(() => {
            notification.css('transform', 'translateX(0)');
        }, 100);

        setTimeout(() => {
            notification.css('transform', 'translateX(100%)');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    };

    // ========================================
    // FUNCIONES DE DEBUG Y TESTING
    // ========================================

    // Debug completo del sistema
    window.debugMarkerSystem = function () {
        if (!window.ConsoleMonitor) {
            console.error('❌ ConsoleMonitor no disponible');
            return;
        }

        const cm = window.ConsoleMonitor;

        console.log('🔍 DEBUG DEL SISTEMA DE MARCADORES:');
        console.log('📍 Estado actual:', {
            isMarkerSelectionMode: cm.state.isMarkerSelectionMode,
            selectedMarker: cm.state.selectedMarker,
            currentMarkers: cm.state.currentMarkers,
            markersVisible: cm.state.markersVisible,
            currentNoteType: cm.state.currentNoteType
        });

        console.log('📝 Notas avanzadas:', cm.state.advancedNotes);
        console.log('📋 Notas básicas:', cm.simpleNotes.data);

        console.log('🎯 Elementos DOM:', {
            markersContainer: cm.elements.$markersContainer?.length || 0,
            markersOnPage: $('.cm-marker').length,
            modalOpen: cm.elements.$noteModal?.is(':visible') || false,
            simpleWidgetOpen: $('.cm-simple-notes-widget').is(':visible')
        });

        return {
            state: cm.state,
            advancedNotes: cm.state.advancedNotes,
            simpleNotes: cm.simpleNotes.data,
            elements: {
                markersContainer: cm.elements.$markersContainer?.length || 0,
                markersOnPage: $('.cm-marker').length
            }
        };
    };

    // Test notas avanzadas
    window.testAdvancedNotes = function () {
        console.log('🧪 Testing advanced notes system');

        const $btn = $('.cm-btn-add-note');
        const $panel = $('#cm-notes');

        console.log('🧪 Elementos encontrados:', {
            button: $btn.length,
            panel: $panel.length,
            cmData: typeof cmData !== 'undefined'
        });

        if ($btn.length === 0) {
            console.error('❌ Botón de notas avanzadas no encontrado');
            return;
        }

        $btn.click();

        setTimeout(() => {
            $('#cm-note-title').val('Nota de prueba ' + Date.now());
            $('#cm-note-description').val('Descripción de prueba para notas avanzadas');
            $('#cm-note-url').val('https://ejemplo.com');

            console.log('🧪 Formulario de nota avanzada llenado');
        }, 500);
    };

    // Test notas básicas
    window.testSimpleNotes = function () {
        console.log('🧪 Testing simple notes system');

        const $btn = $('.cm-simple-toggle-btn');
        const $widget = $('.cm-simple-notes-widget');

        console.log('🧪 Elementos encontrados:', {
            button: $btn.length,
            widget: $widget.length,
            cmData: typeof cmData !== 'undefined'
        });

        if ($btn.length === 0) {
            console.error('❌ Botón de notas básicas no encontrado');
            return;
        }

        $btn.click();

        setTimeout(() => {
            const testText = 'Nota básica de prueba ' + Date.now();
            $('.cm-simple-note-input').val(testText);
            $('.cm-simple-btn-add').click();

            console.log('🧪 Nota básica de prueba creada:', testText);
        }, 500);
    };

    // Test sistema de marcadores
    window.testMarkersSystem = function () {
        console.log('🧪 Testing markers system');

        const cm = window.ConsoleMonitor;

        cm.state.currentMarkers = [
            { id: 1, type: 'advanced', title: 'Nota de prueba 1', x: 200, y: 300 },
            { id: 2, type: 'simple', title: 'Nota rápida 1', x: 400, y: 500 },
            { id: 3, type: 'advanced', title: 'Otra nota', x: 600, y: 200 }
        ];

        cm.renderPageMarkers();

        setTimeout(() => {
            $('.cm-marker').first().click();
        }, 1000);

        console.log('🧪 Marcadores de prueba renderizados');
    };

    // Verificar configuración completa
    window.checkNotesConfig = function () {
        console.log('🔧 Verificando configuración completa de notas con marcadores');

        const checks = {
            'jQuery': typeof jQuery !== 'undefined',
            'ConsoleMonitor': typeof window.ConsoleMonitor !== 'undefined',
            'cmData': typeof cmData !== 'undefined',
            'AJAX URL': typeof cmData !== 'undefined' && cmData.ajax_url,
            'Nonce': typeof cmData !== 'undefined' && cmData.nonce,
            'Current URL': typeof cmData !== 'undefined' && cmData.current_url,

            // Sistema avanzado
            'Botón nueva nota avanzada': $('.cm-btn-add-note').length > 0,
            'Panel notas avanzadas': $('#cm-notes').length > 0,
            'Modal notas avanzadas': $('#cm-note-modal').length > 0,
            'Formulario avanzado': $('#cm-note-form').length > 0,
            'Botón toggle marcadores': $('.cm-btn-toggle-markers').length > 0,

            // Sistema básico
            'Botón notas básicas': $('.cm-simple-toggle-btn').length > 0,
            'Widget notas básicas': $('.cm-simple-notes-widget').length > 0,
            'Lista notas básicas': $('.cm-simple-notes-list').length > 0,

            // Sistema de marcadores
            'Contenedor de marcadores': $('#cm-markers-container').length > 0,
            'Campos de coordenadas': $('#cm-marker-x, #cm-marker-y').length === 2,
            'Instrucciones de marcador': $('#cm-marker-instruction').length > 0,
            'Marcador seleccionado': $('#cm-marker-selected').length > 0,

            // Funciones del sistema
            'Función startMarkerSelection': typeof window.ConsoleMonitor.startMarkerSelection === 'function',
            'Función goToMarker': typeof window.ConsoleMonitor.goToMarker === 'function',
            'Función loadPageMarkers': typeof window.ConsoleMonitor.loadPageMarkers === 'function',
            'Función renderPageMarkers': typeof window.ConsoleMonitor.renderPageMarkers === 'function',
            'Función bindMarkerSelectionEvents': typeof window.ConsoleMonitor.bindMarkerSelectionEvents === 'function'
        };

        console.table(checks);

        let allGood = true;
        for (let check in checks) {
            if (!checks[check]) {
                console.error('❌', check);
                allGood = false;
            } else {
                console.log('✅', check);
            }
        }

        if (allGood) {
            console.log('🎉 ¡Configuración completa con marcadores correcta!');
        } else {
            console.error('❌ Hay problemas en la configuración');
        }

        return checks;
    };

    // ========================================
    // AUTO-INICIALIZACIÓN Y EVENTOS GLOBALES
    // ========================================

    // Auto-verificación al cargar
    setTimeout(function () {
        if (typeof window.ConsoleMonitor !== 'undefined') {
            console.log('');
            console.log('🎯 ===========================================');
            console.log('🎯 CONSOLE MONITOR NOTES - VERSIÓN CORREGIDA');
            console.log('🎯 ===========================================');
            console.log('✅ Sistema cargado exitosamente');
            console.log('');
            console.log('🧪 Comandos de testing disponibles:');
            console.log('- testAdvancedNotes() : Test notas avanzadas');
            console.log('- testSimpleNotes() : Test notas básicas');
            console.log('- testMarkersSystem() : Test sistema de marcadores');
            console.log('- checkNotesConfig() : Verificar configuración completa');
            console.log('- debugMarkerSystem() : Debug completo del sistema');
            console.log('');
            console.log('📍 Funciones de marcadores:');
            console.log('- ConsoleMonitor.loadPageMarkers() : Cargar marcadores');
            console.log('- ConsoleMonitor.toggleMarkersVisibility() : Toggle visibilidad');
            console.log('- ConsoleMonitor.goToMarker(id, type) : Ir a marcador');
            console.log('');
            console.log('🔧 Debug adicional:');
            console.log('- debugConsoleMonitor() : Diagnóstico completo');
            console.log('🎯 ===========================================');
            console.log('');

            // Ejecutar debug inicial
            setTimeout(debugConsoleMonitor, 1000);

            // Cargar marcadores automáticamente
            if (window.ConsoleMonitor.loadPageMarkers) {
                setTimeout(() => {
                    window.ConsoleMonitor.loadPageMarkers();
                }, 2000);
            }
        } else {
            console.error('❌ ConsoleMonitor no se inicializó correctamente');
        }
    }, 3000);

    // Listener para cuando se abre el panel de notas
    $(document).on('cm:panel:opened', function (e, panelType) {
        if (panelType === 'notes') {
            console.log('📍 Panel de notas abierto - cargando marcadores');
            setTimeout(() => {
                if (window.ConsoleMonitor.loadPageMarkers) {
                    window.ConsoleMonitor.loadPageMarkers();
                }
            }, 500);
        }
    });

    // Auto-cargar marcadores cuando cambia la URL (para SPAs)
    let currentUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            console.log('📍 URL changed - reloading markers');
            if (window.ConsoleMonitor && window.ConsoleMonitor.loadPageMarkers) {
                setTimeout(() => {
                    window.ConsoleMonitor.loadPageMarkers();
                }, 1000);
            }
        }
    }, 2000);

    // ========================================
    // FUNCIONES GLOBALES ADICIONALES
    // ========================================

    // Función global para testing rápido de marcadores
    window.testAdvancedNotesWithMarkers = function () {
        console.log('🧪 Testing advanced notes with markers');

        const $btn = $('.cm-btn-add-note');
        if ($btn.length === 0) {
            console.error('❌ Botón de notas avanzadas no encontrado');
            return;
        }

        $btn.click();

        setTimeout(() => {
            console.log('🧪 Modal abierto, modo selección activado');
            console.log('🎯 Haz clic en cualquier elemento para marcarlo');
        }, 1000);
    };

    // Función global para testing rápido de notas básicas con marcadores  
    window.testSimpleNotesWithMarkers = function () {
        console.log('🧪 Testing simple notes with markers');

        const $btn = $('.cm-simple-toggle-btn');
        if ($btn.length === 0) {
            console.error('❌ Botón de notas básicas no encontrado');
            return;
        }

        $btn.click();

        setTimeout(() => {
            console.log('🧪 Widget abierto, modo selección activado');
            console.log('🎯 Haz clic en cualquier elemento para marcarlo');
        }, 500);
    };

    // Función para simular marcadores de prueba
    window.simulateTestMarkers = function () {
        if (!window.ConsoleMonitor) {
            console.error('❌ ConsoleMonitor no disponible');
            return;
        }

        const testMarkers = [
            {
                id: 999,
                type: 'advanced',
                title: 'Marcador de prueba 1',
                x: Math.floor(Math.random() * window.innerWidth),
                y: Math.floor(Math.random() * window.innerHeight)
            },
            {
                id: 998,
                type: 'simple',
                title: 'Marcador de prueba 2',
                x: Math.floor(Math.random() * window.innerWidth),
                y: Math.floor(Math.random() * window.innerHeight)
            }
        ];

        window.ConsoleMonitor.state.currentMarkers = testMarkers;
        window.ConsoleMonitor.renderPageMarkers();

        console.log('🧪 Marcadores de prueba creados:', testMarkers);

        setTimeout(() => {
            const $firstMarker = $('.cm-marker').first();
            if ($firstMarker.length) {
                console.log('🎯 Auto-clicking primer marcador...');
                $firstMarker.click();
            }
        }, 2000);
    };

    // Función para limpiar marcadores de prueba
    window.clearTestMarkers = function () {
        if (!window.ConsoleMonitor) {
            console.error('❌ ConsoleMonitor no disponible');
            return;
        }

        window.ConsoleMonitor.state.currentMarkers = [];
        window.ConsoleMonitor.elements.$markersContainer.empty();

        console.log('🧹 Marcadores de prueba eliminados');
    };

    // Función para forzar recarga de marcadores
    window.forceReloadMarkers = function () {
        if (!window.ConsoleMonitor) {
            console.error('❌ ConsoleMonitor no disponible');
            return;
        }

        console.log('🔄 Forzando recarga de marcadores...');
        window.ConsoleMonitor.loadPageMarkers();
    };

    // Función para toggle rápido de visibilidad
    window.toggleMarkers = function () {
        if (!window.ConsoleMonitor) {
            console.error('❌ ConsoleMonitor no disponible');
            return;
        }

        window.ConsoleMonitor.toggleMarkersVisibility();
    };

    // ========================================
    // DIAGNÓSTICO FINAL
    // ========================================

    // Hacer función de debug disponible globalmente
    window.debugConsoleMonitor = debugConsoleMonitor;

    console.log('📦 Console Monitor Notes COMPLETO - VERSIÓN CORREGIDA Y OPTIMIZADA');
    console.log('✅ Todas las funciones implementadas y corregidas');
    console.log('✅ Sistema de debug mejorado');
    console.log('✅ Manejo de errores robusto');
    console.log('✅ Validaciones de dependencias');
    console.log('✅ Funciones de testing incluidas');

})(jQuery);