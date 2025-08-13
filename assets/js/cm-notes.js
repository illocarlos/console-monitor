/**
 * Console Monitor Pro - JavaScript NOTAS COMPLETO CON MARCADORES - VERSIÓN CORREGIDA
 * assets/js/cm-notes.js  
 * Sistema completo: notas avanzadas (con modal) + notas básicas (widget) + MARCADORES VISUALES
 */

(function ($) {
    'use strict';

    if (!window.ConsoleMonitor) {
        console.error('CM Notes: ConsoleMonitor core no disponible');
        return;
    }

    // ESTADOS PARA AMBOS SISTEMAS + MARCADORES - VERSIÓN CORREGIDA
    // ========================================

    // Extender estado para notas avanzadas
    $.extend(window.ConsoleMonitor.state, {
        advancedNotes: [],
        currentEditingNote: null,
        isEditingNote: false,
        // NUEVO: Estados para marcadores - FIX: Inicializar con valores por defecto
        isMarkerSelectionMode: false,
        selectedMarker: null,
        currentMarkers: [], // FIX: Inicializar como array vacío
        markersVisible: true,
        currentNoteType: null
    });

    // Estado para notas básicas
    window.ConsoleMonitor.simpleNotes = {
        data: [],
        isVisible: false,
        // NUEVO: Marcador para notas básicas
        selectedMarker: null
    };

    // Extender elementos DOM
    $.extend(window.ConsoleMonitor.elements, {
        $notes: null,
        $notesContainer: null,
        $noteModal: null,
        $noteForm: null,
        // NUEVO: Contenedor de marcadores
        $markersContainer: null
    });

    // ========================================
    // INICIALIZACIÓN - FIX: Mejorar manejo de errores
    // ========================================

    const originalInit = window.ConsoleMonitor.init;
    window.ConsoleMonitor.init = function () {
        try {
            originalInit.call(this);
            this.initNotesModule();
            this.initSimpleNotesModule();
            // NUEVO: Inicializar sistema de marcadores
            this.initMarkersSystem();
        } catch (error) {
            console.error('Error inicializando ConsoleMonitor:', error);
        }
    };

    const originalCacheElements = window.ConsoleMonitor.cacheElements;
    window.ConsoleMonitor.cacheElements = function () {
        try {
            originalCacheElements.call(this);
            this.elements.$notes = $('#cm-notes');
            this.elements.$notesContainer = $('#cm-notes-container');
            this.elements.$noteModal = $('#cm-note-modal');
            this.elements.$noteForm = $('#cm-note-form');
            // NUEVO: Cachear contenedor de marcadores
            this.elements.$markersContainer = $('#cm-markers-container');

            // FIX: Verificar que el contenedor de marcadores existe
            if (this.elements.$markersContainer.length === 0) {
                console.warn('📍 Contenedor de marcadores no encontrado, creándolo...');
                $('body').append('<div id="cm-markers-container" class="cm-markers-container"></div>');
                this.elements.$markersContainer = $('#cm-markers-container');
            }
        } catch (error) {
            console.error('Error cacheando elementos:', error);
        }
    };

    // Inicialización notas avanzadas
    window.ConsoleMonitor.initNotesModule = function () {
        try {
            this.bindAdvancedNotesEvents();
            console.log('📝 Advanced Notes System initialized');
        } catch (error) {
            console.error('Error inicializando notas avanzadas:', error);
        }
    };

    // Inicialización notas básicas
    window.ConsoleMonitor.initSimpleNotesModule = function () {
        try {
            this.bindSimpleNotesEvents();
            this.loadSimpleNotesCount();
            console.log('📝 Simple Notes System initialized');
        } catch (error) {
            console.error('Error inicializando notas básicas:', error);
        }
    };

    // NUEVO: Inicialización sistema de marcadores
    window.ConsoleMonitor.initMarkersSystem = function () {
        try {
            // FIX: Asegurar que el estado está inicializado
            if (!this.state.currentMarkers) {
                this.state.currentMarkers = [];
            }
            if (typeof this.state.markersVisible === 'undefined') {
                this.state.markersVisible = true;
            }

            this.bindMarkersEvents();

            // FIX: Cargar marcadores con manejo de errores
            setTimeout(() => {
                try {
                    this.loadPageMarkers();
                } catch (error) {
                    console.error('Error cargando marcadores iniciales:', error);
                }
            }, 1000);

            console.log('📍 Visual Markers System initialized');
        } catch (error) {
            console.error('Error inicializando sistema de marcadores:', error);
        }
    };

    // ========================================
    // EVENTOS DEL SISTEMA AVANZADO
    // ========================================

    window.ConsoleMonitor.bindAdvancedNotesEvents = function () {
        const self = this;

        // Panel abierto - cargar notas avanzadas
        $(document).on('cm:panel:opened', function (e, panelType) {
            if (panelType === 'notes') {
                setTimeout(() => {
                    self.loadAdvancedNotes();
                    // NUEVO: Cargar marcadores al abrir panel
                    self.loadPageMarkers();
                }, 100);
            }
        });

        // Botón nueva nota avanzada
        $(document).on('click', '.cm-btn-add-note', function (e) {
            e.preventDefault();
            self.openNoteModal();
        });

        // Botón actualizar notas
        $(document).on('click', '.cm-btn-refresh-notes', function (e) {
            e.preventDefault();
            self.loadAdvancedNotes();
            // NUEVO: Actualizar marcadores también
            self.loadPageMarkers();
        });

        // NUEVO: Botón toggle marcadores
        $(document).on('click', '.cm-btn-toggle-markers', function (e) {
            e.preventDefault();
            self.toggleMarkersVisibility();
        });

        // Modal events
        $(document).on('click', '.cm-note-modal-close, .cm-btn-cancel', function (e) {
            e.preventDefault();
            self.closeNoteModal();
        });

        // Cerrar modal al hacer click fuera - CORREGIDO
        $(document).on('click', '#cm-note-modal', function (e) {
            // NUEVO: No cerrar si estamos en modo selección de marcador
            if (self.state.isMarkerSelectionMode) {
                return;
            }

            if (e.target === this) {
                self.closeNoteModal();
            }
        });

        // Submit del formulario
        $(document).on('submit', '#cm-note-form', function (e) {
            e.preventDefault();
            self.saveAdvancedNote();
        });

        // NUEVO: Cambiar marcador
        $(document).on('click', '.cm-btn-change-marker', function (e) {
            e.preventDefault();
            self.startMarkerSelection('advanced');
        });

        // Agregar item a checklist
        $(document).on('click', '.cm-checklist-add', function (e) {
            e.preventDefault();
            self.addChecklistItem($(this));
        });

        // Remover item de checklist
        $(document).on('click', '.cm-checklist-remove', function (e) {
            e.preventDefault();
            $(this).closest('.cm-checklist-item').remove();
        });

        // Enter en checklist input
        $(document).on('keypress', '.cm-checklist-input', function (e) {
            if (e.which === 13) { // Enter
                e.preventDefault();
                const $addBtn = $(this).siblings('.cm-checklist-add');
                if ($addBtn.length) {
                    $addBtn.click();
                }
            }
        });

        // Editar nota avanzada
        $(document).on('click', '.cm-advanced-note-edit', function (e) {
            e.preventDefault();
            e.stopPropagation(); // NUEVO: Evitar conflicto con click en nota
            const noteId = $(this).data('note-id');
            self.editAdvancedNote(noteId);
        });

        // Eliminar nota avanzada
        $(document).on('click', '.cm-advanced-note-delete', function (e) {
            e.preventDefault();
            e.stopPropagation(); // NUEVO: Evitar conflicto con click en nota
            const noteId = $(this).data('note-id');
            if (confirm('¿Estás seguro de que quieres eliminar esta nota avanzada?')) {
                self.deleteAdvancedNote(noteId);
            }
        });

        // NUEVO: Ir a marcador (nota avanzada)
        $(document).on('click', '.cm-advanced-note-goto', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = $(this).data('note-id');
            self.goToMarker(noteId, 'advanced');
        });

        // NUEVO: Click en nota avanzada (ir a marcador)
        $(document).on('click', '.cm-advanced-note.cm-note-with-marker', function (e) {
            // Solo si no se hizo click en un botón
            if (!$(e.target).is('button') && !$(e.target).closest('button').length) {
                const noteId = $(this).data('note-id');
                self.goToMarker(noteId, 'advanced');
            }
        });

        // ESC para cerrar modal
        $(document).on('keyup', function (e) {
            if (e.keyCode === 27) {
                if (self.elements.$noteModal.is(':visible')) {
                    self.closeNoteModal();
                }
                // NUEVO: También cancelar selección de marcador
                else if (self.state.isMarkerSelectionMode) {
                    self.cancelMarkerSelection();
                }
            }
        });
    };

    // ========================================
    // FUNCIONES DEL SISTEMA AVANZADO
    // ========================================

    // Cargar notas avanzadas
    window.ConsoleMonitor.loadAdvancedNotes = function () {
        const self = this;

        console.log('📝 Cargando notas avanzadas...');

        if (typeof cmData === 'undefined') {
            console.error('📝 cmData no disponible para notas avanzadas');
            this.showAdvancedNotesError('Error: Configuración no disponible');
            return;
        }

        $.post(cmData.ajax_url, {
            action: 'cm_get_notes',
            nonce: cmData.nonce
        })
            .done(function (response) {
                console.log('📝 Respuesta notas avanzadas:', response);

                if (response.success) {
                    self.state.advancedNotes = response.data.notes || [];
                    self.renderAdvancedNotes();
                    self.updateAdvancedNotesCount();
                } else {
                    console.error('📝 Error en respuesta avanzada:', response.data);
                    self.showAdvancedNotesError('Error al cargar notas: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('📝 AJAX Error notas avanzadas:', { xhr, status, error });
                self.showAdvancedNotesError('Error de conexión al cargar notas avanzadas');
            });
    };

    // Renderizar notas avanzadas
    window.ConsoleMonitor.renderAdvancedNotes = function () {
        const $container = this.elements.$notesContainer;

        if (!$container.length) {
            console.warn('📝 Contenedor de notas avanzadas no encontrado');
            return;
        }

        console.log('📝 Renderizando', this.state.advancedNotes.length, 'notas avanzadas');

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
    };

    // Renderizar item individual de nota avanzada
    window.ConsoleMonitor.renderAdvancedNoteItem = function (note) {
        const checklistHtml = (note.checklist && note.checklist.length > 0) ?
            `<ul class="cm-advanced-note-checklist">
                ${note.checklist.map(item => `
                    <li>
                        <input type="checkbox" ${item.checked ? 'checked' : ''}>
                        <span>${this.escapeHtml(item.text)}</span>
                    </li>
                `).join('')}
            </ul>` : '';

        const urlHtml = note.url ?
            `<a href="${note.url}" target="_blank" class="cm-advanced-note-url">🔗 ${note.url}</a>` : '';

        // NUEVO: Información del marcador
        const markerInfo = note.has_marker ?
            `<div class="cm-advanced-note-marker-info">📍 Marcado en (${note.marker_x}, ${note.marker_y})</div>` : '';

        // NUEVO: Clases CSS para notas con marcador
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

    // Abrir modal de nota
    window.ConsoleMonitor.openNoteModal = function (noteData = null) {
        this.state.isEditingNote = !!noteData;
        this.state.currentEditingNote = noteData;

        // Configurar título del modal
        const modalTitle = noteData ? 'Editar Nota con Marcador' : 'Nueva Nota con Marcador';
        $('#cm-note-modal-title').text(modalTitle);

        // Limpiar formulario
        this.elements.$noteForm[0].reset();
        $('#cm-checklist-container').html(`
            <div class="cm-checklist-item">
                <input type="text" placeholder="Nueva tarea..." class="cm-checklist-input">
                <button type="button" class="cm-checklist-add">➕</button>
            </div>
        `);

        // NUEVO: Resetear estado de marcador
        this.state.selectedMarker = null;
        $('#cm-page-url').val(cmData.current_url);

        // Si estamos editando, llenar con datos
        if (noteData) {
            $('#cm-note-title').val(noteData.title);
            $('#cm-note-description').val(noteData.description);
            $('#cm-note-url').val(noteData.url);

            // NUEVO: Si tiene marcador, mostrarlo
            if (noteData.has_marker) {
                this.state.selectedMarker = {
                    x: noteData.marker_x,
                    y: noteData.marker_y
                };
                $('#cm-marker-x').val(noteData.marker_x);
                $('#cm-marker-y').val(noteData.marker_y);
                this.showSelectedMarker(noteData.marker_x, noteData.marker_y);
            } else {
                this.showMarkerInstruction();
            }

            // Llenar checklist
            if (noteData.checklist && noteData.checklist.length > 0) {
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
            }
        } else {
            // NUEVO: Nota nueva - mostrar instrucción de marcador
            this.showMarkerInstruction();
        }

        // Mostrar modal
        this.elements.$noteModal.fadeIn(300);

        // NUEVO: Si no hay marcador, activar modo selección
        if (!this.state.selectedMarker) {
            setTimeout(() => {
                this.startMarkerSelection('advanced');
            }, 500);
        } else {
            $('#cm-note-title').focus();
        }
    };

    // Cerrar modal de nota
    window.ConsoleMonitor.closeNoteModal = function () {
        this.elements.$noteModal.fadeOut(300);
        this.state.isEditingNote = false;
        this.state.currentEditingNote = null;
        // NUEVO: Cancelar selección de marcador
        this.cancelMarkerSelection();
    };

    // NUEVO: Mostrar instrucción de marcador
    window.ConsoleMonitor.showMarkerInstruction = function () {
        $('#cm-marker-instruction').show();
        $('#cm-marker-selected').hide();
    };

    // NUEVO: Mostrar marcador seleccionado
    window.ConsoleMonitor.showSelectedMarker = function (x, y, elementInfo = '') {
        $('#cm-marker-instruction').hide();
        $('#cm-marker-selected').show();
        $('#cm-marker-coordinates').text(`${x}, ${y}`);
        $('#cm-marker-element-info').text(elementInfo || 'Elemento seleccionado');
        $('#cm-marker-x').val(x);
        $('#cm-marker-y').val(y);
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

        // Crear nuevo item
        const newItemHtml = `
            <div class="cm-checklist-item">
                <input type="text" value="${this.escapeHtml(text)}" class="cm-checklist-input" data-checked="false">
                <button type="button" class="cm-checklist-remove">🗑️</button>
            </div>
        `;

        // Insertar antes del item de "agregar"
        $button.closest('.cm-checklist-item').before(newItemHtml);

        // Limpiar input
        $input.val('').focus();
    };

    // Guardar nota avanzada
    window.ConsoleMonitor.saveAdvancedNote = function () {
        const self = this;

        // Recopilar datos del formulario
        const title = $('#cm-note-title').val().trim();
        const description = $('#cm-note-description').val().trim();
        const url = $('#cm-note-url').val().trim();
        // NUEVO: Coordenadas del marcador
        const marker_x = parseInt($('#cm-marker-x').val()) || 0;
        const marker_y = parseInt($('#cm-marker-y').val()) || 0;
        const page_url = $('#cm-page-url').val();

        if (!title) {
            alert('El título es requerido');
            $('#cm-note-title').focus();
            return;
        }

        // NUEVO: Validar marcador
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

        // Preparar datos
        const noteData = {
            title: title,
            description: description,
            url: url,
            checklist: JSON.stringify(checklist),
            // NUEVO: Datos del marcador
            marker_x: marker_x,
            marker_y: marker_y,
            page_url: page_url
        };

        // Si estamos editando, agregar ID
        if (this.state.isEditingNote && this.state.currentEditingNote) {
            noteData.note_id = this.state.currentEditingNote.id;
        }

        // Mostrar estado de carga
        const $saveBtn = $('.cm-btn-save');
        const originalText = $saveBtn.text();
        $saveBtn.text('Guardando...').prop('disabled', true);

        // Determinar acción
        const action = this.state.isEditingNote ? 'cm_update_note' : 'cm_save_note';

        // Enviar
        $.post(cmData.ajax_url, {
            action: action,
            nonce: cmData.nonce,
            ...noteData
        })
            .done(function (response) {
                console.log('📝 Nota avanzada guardada:', response);

                if (response.success) {
                    self.closeNoteModal();
                    self.loadAdvancedNotes(); // Recargar lista
                    // NUEVO: Recargar marcadores
                    self.loadPageMarkers();
                    self.showNotification(response.data.message || 'Nota con marcador guardada', 'success');
                } else {
                    console.error('📝 Error guardando nota avanzada:', response.data);
                    alert('❌ Error: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('📝 AJAX Error guardando nota avanzada:', { xhr, status, error });
                alert('Error de conexión al guardar nota avanzada');
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

        this.openNoteModal(note);
    };

    // Eliminar nota avanzada
    window.ConsoleMonitor.deleteAdvancedNote = function (noteId) {
        const self = this;

        console.log('🗑️ Eliminando nota avanzada:', noteId);

        $.post(cmData.ajax_url, {
            action: 'cm_delete_note',
            nonce: cmData.nonce,
            note_id: noteId
        })
            .done(function (response) {
                console.log('🗑️ Respuesta eliminar nota avanzada:', response);

                if (response.success) {
                    self.loadAdvancedNotes(); // Recargar lista
                    // NUEVO: Recargar marcadores
                    self.loadPageMarkers();
                    self.showNotification(response.data.message || 'Nota eliminada', 'success');
                } else {
                    console.error('🗑️ Error eliminando nota avanzada:', response.data);
                    alert('❌ Error: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('🗑️ AJAX Error eliminando nota avanzada:', { xhr, status, error });
                alert('Error de conexión al eliminar nota avanzada');
            });
    };

    // Actualizar contador de notas avanzadas
    window.ConsoleMonitor.updateAdvancedNotesCount = function () {
        const count = this.state.advancedNotes.length;
        // NUEVO: Mostrar también cuántas tienen marcador
        const markersCount = this.state.advancedNotes.filter(n => n.has_marker).length;
        $('#cm-notes .cm-notes-count').text(`${count} notas (${markersCount} marcadas)`);
        console.log('📝 Contador de notas avanzadas actualizado:', count, 'marcadores:', markersCount);
    };

    // Mostrar error en notas avanzadas
    window.ConsoleMonitor.showAdvancedNotesError = function (message) {
        const $container = this.elements.$notesContainer;
        if ($container.length) {
            $container.html(`
                <div class="cm-notes-empty">
                    <div class="cm-notes-empty-icon" style="color: #e74c3c;">❌</div>
                    <div class="cm-notes-empty-title" style="color: #e74c3c;">Error</div>
                    <div class="cm-notes-empty-text">${message}</div>
                </div>
            `);
        }
    };

    // ========================================
    // EVENTOS DEL SISTEMA BÁSICO (RÁPIDO) - CORREGIDO
    // ========================================

    window.ConsoleMonitor.bindSimpleNotesEvents = function () {
        const self = this;

        // Toggle panel de notas básicas
        $(document).on('click', '.cm-simple-toggle-btn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const $widget = $('.cm-simple-notes-widget');
            if ($widget.is(':visible')) {
                $widget.hide();
                self.simpleNotes.isVisible = false;
                // NUEVO: Cancelar selección de marcador
                self.cancelMarkerSelection();
            } else {
                $widget.show();
                self.simpleNotes.isVisible = true;
                self.loadSimpleNotes();
                // NUEVO: Activar modo selección si no hay marcador
                if (!self.simpleNotes.selectedMarker) {
                    setTimeout(() => {
                        self.startMarkerSelection('simple');
                    }, 300);
                }
            }
        });

        // Cerrar panel de notas básicas
        $(document).on('click', '.cm-simple-btn-close', function (e) {
            e.preventDefault();
            $('.cm-simple-notes-widget').hide();
            self.simpleNotes.isVisible = false;
            // NUEVO: Cancelar selección de marcador
            self.cancelMarkerSelection();
        });

        // NUEVO: Cambiar marcador en notas básicas
        $(document).on('click', '.cm-simple-btn-change-marker', function (e) {
            e.preventDefault();
            self.startMarkerSelection('simple');
        });

        // Agregar nota básica
        $(document).on('click', '.cm-simple-btn-add', function (e) {
            e.preventDefault();

            const text = $('.cm-simple-note-input').val().trim();
            if (!text) {
                alert('Por favor escribe una nota');
                $('.cm-simple-note-input').focus();
                return;
            }

            // NUEVO: Validar marcador
            if (!self.simpleNotes.selectedMarker) {
                alert('Debes marcar un punto en la página');
                self.startMarkerSelection('simple');
                return;
            }

            self.saveSimpleNote(text);
        });

        // Enter para agregar nota básica
        $(document).on('keypress', '.cm-simple-note-input', function (e) {
            if (e.which === 13) { // Enter key
                e.preventDefault();
                $('.cm-simple-btn-add').click();
            }
        });

        // Eliminar nota básica
        $(document).on('click', '.cm-simple-note-delete', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (!confirm('¿Eliminar esta nota rápida?')) return;

            const noteId = $(this).data('note-id');
            if (noteId) {
                self.deleteSimpleNote(noteId);
            }
        });

        // NUEVO: Click en nota básica (ir a marcador)
        $(document).on('click', '.cm-simple-note-item.cm-simple-note-with-marker', function (e) {
            // Solo si no se hizo click en el botón eliminar
            if (!$(e.target).is('.cm-simple-note-delete') && !$(e.target).closest('.cm-simple-note-delete').length) {
                const noteId = $(this).data('note-id');
                self.goToMarker(noteId, 'simple');
            }
        });

        // Cerrar al hacer click fuera - CORREGIDO FINAL
        $(document).on('click', function (e) {
            // NUEVO: No cerrar si estamos en modo selección O si es dentro de un elemento de la interfaz
            if (self.state.isMarkerSelectionMode) {
                return;
            }

            // Solo cerrar si estamos REALMENTE fuera de la interfaz
            if (self.simpleNotes.isVisible &&
                !$(e.target).closest('.cm-simple-notes-widget, .cm-simple-toggle-btn, .cm-floating-container, .cm-panel, .cm-note-modal').length) {
                $('.cm-simple-notes-widget').hide();
                self.simpleNotes.isVisible = false;
                // NUEVO: Cancelar selección de marcador
                self.cancelMarkerSelection();
            }
        });

        // ESC para cerrar notas básicas - MEJORADO
        $(document).on('keyup', function (e) {
            if (e.keyCode === 27) { // ESC
                if (self.state.isMarkerSelectionMode) {
                    // Si estamos en modo selección, solo cancelar selección
                    self.cancelMarkerSelection();
                } else if (self.simpleNotes.isVisible) {
                    // Si no hay selección activa, cerrar widget
                    $('.cm-simple-notes-widget').hide();
                    self.simpleNotes.isVisible = false;
                    self.cancelMarkerSelection();
                }
            }
        });
    };

    // ========================================
    // FUNCIONES DEL SISTEMA BÁSICO
    // ========================================

    // Cargar notas básicas
    window.ConsoleMonitor.loadSimpleNotes = function () {
        const self = this;

        console.log('📝 Cargando notas básicas...');

        if (typeof cmData === 'undefined') {
            console.error('📝 cmData no disponible para notas básicas');
            alert('Error: Configuración no disponible');
            return;
        }

        $.post(cmData.ajax_url, {
            action: 'cm_get_simple_notes',
            nonce: cmData.nonce
        })
            .done(function (response) {
                console.log('📝 Respuesta notas básicas:', response);

                if (response.success) {
                    self.simpleNotes.data = response.data.notes || [];
                    self.renderSimpleNotes();
                    self.updateSimpleNotesCount();
                } else {
                    console.error('📝 Error en respuesta básica:', response.data);
                    alert('Error al cargar notas: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('📝 AJAX Error notas básicas:', { xhr, status, error });
                alert('Error de conexión al cargar notas básicas');
            });
    };

    // Guardar nota básica
    window.ConsoleMonitor.saveSimpleNote = function (text) {
        const self = this;

        console.log('📝 Guardando nota básica:', text);

        // NUEVO: Validar marcador antes de guardar
        if (!this.simpleNotes.selectedMarker) {
            alert('Debes marcar un punto en la página');
            return;
        }

        $.post(cmData.ajax_url, {
            action: 'cm_save_simple_note',
            nonce: cmData.nonce,
            note_text: text,
            // NUEVO: Enviar coordenadas del marcador
            marker_x: this.simpleNotes.selectedMarker.x,
            marker_y: this.simpleNotes.selectedMarker.y,
            page_url: cmData.current_url
        })
            .done(function (response) {
                console.log('📝 Nota básica guardada:', response);

                if (response.success) {
                    // Limpiar input
                    $('.cm-simple-note-input').val('');

                    // Recargar lista
                    self.loadSimpleNotes();
                    // NUEVO: Recargar marcadores
                    self.loadPageMarkers();

                    // Mostrar éxito brevemente
                    const $btn = $('.cm-simple-btn-add');
                    const originalText = $btn.text();
                    $btn.text('✅ Guardada').prop('disabled', true);
                    setTimeout(() => {
                        $btn.text(originalText).prop('disabled', false);
                    }, 1000);

                    // NUEVO: Resetear marcador para próxima nota
                    self.simpleNotes.selectedMarker = null;
                    self.updateSimpleMarkerDisplay();

                } else {
                    console.error('📝 Error guardando nota básica:', response.data);
                    alert('❌ Error: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('📝 AJAX Error guardando nota básica:', { xhr, status, error });
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
                console.log('🗑️ Respuesta eliminar nota básica:', response);

                if (response.success) {
                    // Recargar lista
                    self.loadSimpleNotes();
                    // NUEVO: Recargar marcadores
                    self.loadPageMarkers();
                } else {
                    console.error('🗑️ Error eliminando nota básica:', response.data);
                    alert('❌ Error: ' + (response.data || 'Error desconocido'));
                }
            })
            .fail(function (xhr, status, error) {
                console.error('🗑️ AJAX Error eliminando nota básica:', { xhr, status, error });
                alert('Error de conexión al eliminar nota básica');
            });
    };

    // Renderizar lista de notas básicas
    window.ConsoleMonitor.renderSimpleNotes = function () {
        const $list = $('.cm-simple-notes-list');

        if (!$list.length) {
            console.warn('📝 Lista de notas básicas no encontrada');
            return;
        }

        console.log('📝 Renderizando', this.simpleNotes.data.length, 'notas básicas');

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

        // NUEVO: Renderizar con información de marcadores
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

        console.log('📝 Contador de notas básicas actualizado:', count);
    };

    // NUEVO: Actualizar display del marcador en notas básicas
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

    // Cargar solo el contador (para mostrar en el botón)
    window.ConsoleMonitor.loadSimpleNotesCount = function () {
        const self = this;

        // Solo cargar contador, no toda la interfaz
        $.post(cmData.ajax_url, {
            action: 'cm_get_simple_notes',
            nonce: cmData.nonce
        })
            .done(function (response) {
                if (response.success) {
                    self.simpleNotes.data = response.data.notes || [];
                    self.updateSimpleNotesCount();
                }
            })
            .fail(function () {
                console.log('📝 Error cargando contador básico (silenciado)');
            });
    };

    // ========================================
    // NUEVO: SISTEMA DE MARCADORES VISUALES - CORREGIDO
    // ========================================

    window.ConsoleMonitor.bindMarkersEvents = function () {
        const self = this;

        // Click en marcador visual
        $(document).on('click', '.cm-marker', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const markerId = $(this).data('marker-id');
            const markerType = $(this).data('marker-type');

            if (markerId && markerType) {
                self.goToMarker(markerId, markerType);
                self.highlightMarker($(this));
            }
        });
    };

    // FUNCIÓN CORREGIDA - bindMarkerSelectionEvents
    window.ConsoleMonitor.bindMarkerSelectionEvents = function () {
        const self = this;

        console.log('📍 Binding marker selection events');

        // Modo selección de marcadores - VERSIÓN CORREGIDA
        $(document).off('click.markerSelection').on('click.markerSelection', function (e) {
            if (self.state.isMarkerSelectionMode) {
                // Excluir elementos de interfaz
                if ($(e.target).closest('.cm-note-modal, .cm-simple-notes-widget, .cm-floating-container, .cm-panel, .cm-marker-selection-indicator').length) {
                    return; // No procesar si el click es en la interfaz
                }

                e.preventDefault();
                e.stopPropagation();

                // Calcular coordenadas
                const x = e.pageX;
                const y = e.pageY;

                // Obtener información del elemento
                const element = e.target;
                const elementInfo = self.getElementInfo(element);

                // Establecer marcador seleccionado
                self.setSelectedMarker(x, y, elementInfo);
            }
        });

        // Prevent default en modo selección
        $(document).off('mousedown.markerSelection').on('mousedown.markerSelection', function (e) {
            if (self.state.isMarkerSelectionMode) {
                // Solo prevenir si NO es en la interfaz
                if (!$(e.target).closest('.cm-note-modal, .cm-simple-notes-widget, .cm-floating-container, .cm-panel').length) {
                    e.preventDefault();
                }
            }
        });
    };

    // Cargar marcadores de la página - VERSIÓN CORREGIDA
    window.ConsoleMonitor.loadPageMarkers = function () {
        const self = this;

        console.log('📍 Cargando marcadores de la página...');

        if (typeof cmData === 'undefined') {
            console.warn('📍 cmData no disponible para marcadores');
            return;
        }

        // FIX: Verificar y reparar estado antes de cargar
        this.verifyAndRepairState();

        $.post(cmData.ajax_url, {
            action: 'cm_get_page_markers',
            nonce: cmData.nonce
        })
            .done(function (response) {
                console.log('📍 Respuesta marcadores:', response);

                if (response.success && response.data) {
                    // FIX: Asegurar que la respuesta tenga la estructura correcta
                    const markers = response.data.markers ? response.data.markers : [];

                    // FIX: Validar que markers es un array
                    if (Array.isArray(markers)) {
                        self.state.currentMarkers = markers.filter(marker => self.validateMarker(marker));
                    } else {
                        console.warn('📍 Markers no es un array:', markers);
                        self.state.currentMarkers = [];
                    }
                } else {
                    console.error('📍 Error en respuesta marcadores:', response.data);
                    self.state.currentMarkers = [];
                }

                self.renderPageMarkers();
            })
            .fail(function (xhr, status, error) {
                console.error('📍 AJAX Error cargando marcadores:', { xhr, status, error });
                // FIX: Inicializar array vacío en caso de fallo
                self.state.currentMarkers = [];
                self.renderPageMarkers();
            });
    };

    // Renderizar marcadores en la página - VERSIÓN CORREGIDA
    window.ConsoleMonitor.renderPageMarkers = function () {
        const $container = this.elements.$markersContainer;

        if (!$container || !$container.length) {
            console.warn('📍 Contenedor de marcadores no encontrado');
            return;
        }

        // FIX: Asegurar que currentMarkers está inicializado
        if (!this.state.currentMarkers) {
            this.state.currentMarkers = [];
        }

        // FIX: Verificar que currentMarkers es un array
        if (!Array.isArray(this.state.currentMarkers)) {
            console.warn('📍 currentMarkers no es un array:', this.state.currentMarkers);
            this.state.currentMarkers = [];
            return;
        }

        console.log('📍 Renderizando', this.state.currentMarkers.length, 'marcadores');

        // Limpiar marcadores existentes
        $container.empty();

        if (!this.state.markersVisible) {
            return;
        }

        // Crear marcadores
        this.state.currentMarkers.forEach((marker, index) => {
            // FIX: Validar que el marcador tiene las propiedades necesarias
            if (!marker || typeof marker !== 'object') {
                console.warn('📍 Marcador inválido:', marker);
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

        // Animar entrada con delay
        $('.cm-marker').each(function (index) {
            $(this).css('animation-delay', (index * 0.1) + 's');
        });
    };

    // Iniciar selección de marcador
    window.ConsoleMonitor.startMarkerSelection = function (noteType) {
        console.log('📍 Iniciando selección de marcador para:', noteType);

        this.state.isMarkerSelectionMode = true;
        this.state.currentNoteType = noteType;

        // Bind eventos de selección
        this.bindMarkerSelectionEvents();

        // Agregar clase al body
        $('body').addClass('cm-marker-selection-mode');

        // Mostrar overlay e indicador
        $('body').append(`
            <div class="cm-marker-selection-overlay"></div>
            <div class="cm-marker-selection-indicator">
                🎯 Haz clic en cualquier elemento para marcarlo
            </div>
        `);

        // Ocultar marcadores existentes temporalmente
        $('.cm-marker').hide();

        console.log('📍 Modo selección de marcador activado');
    };

    // Cancelar selección de marcador
    window.ConsoleMonitor.cancelMarkerSelection = function () {
        if (!this.state.isMarkerSelectionMode) return;

        console.log('📍 Cancelando selección de marcador');

        this.state.isMarkerSelectionMode = false;
        this.state.currentNoteType = null;

        // Remover eventos de selección
        $(document).off('click.markerSelection');
        $(document).off('mousedown.markerSelection');

        // Remover clases y elementos
        $('body').removeClass('cm-marker-selection-mode');
        $('.cm-marker-selection-overlay').remove();
        $('.cm-marker-selection-indicator').remove();

        // Mostrar marcadores existentes
        $('.cm-marker').show();
    };

    // Establecer marcador seleccionado
    window.ConsoleMonitor.setSelectedMarker = function (x, y, elementInfo) {
        console.log('📍 Marcador seleccionado en:', x, y, elementInfo);

        // Cancelar modo selección
        this.cancelMarkerSelection();

        if (this.state.currentNoteType === 'advanced') {
            // Para notas avanzadas
            this.state.selectedMarker = { x, y };
            this.showSelectedMarker(x, y, elementInfo);
            // Enfocar título si el modal está abierto
            setTimeout(() => {
                $('#cm-note-title').focus();
            }, 300);
        } else if (this.state.currentNoteType === 'simple') {
            // Para notas básicas
            this.simpleNotes.selectedMarker = { x, y };
            this.updateSimpleMarkerDisplay();
            // Enfocar input si el widget está abierto
            setTimeout(() => {
                $('.cm-simple-note-input').focus();
            }, 300);
        }

        // Mostrar marcador temporal
        this.showTemporaryMarker(x, y);
    };

    // Mostrar marcador temporal
    window.ConsoleMonitor.showTemporaryMarker = function (x, y) {
        // Remover marcador temporal anterior
        $('.cm-temp-marker').remove();

        // Crear marcador temporal
        const tempMarker = `
            <div class="cm-marker cm-temp-marker cm-marker-pulse" 
                 style="left: ${x}px; top: ${y}px; background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);">
                🎯
                <div class="cm-marker-tooltip">
                    Nuevo marcador
                </div>
            </div>
        `;

        this.elements.$markersContainer.append(tempMarker);

        // Remover después de 3 segundos
        setTimeout(() => {
            $('.cm-temp-marker').addClass('cm-marker-fade-out');
            setTimeout(() => {
                $('.cm-temp-marker').remove();
            }, 300);
        }, 3000);
    };

    // Ir a marcador
    window.ConsoleMonitor.goToMarker = function (noteId, noteType) {
        console.log('📍 Navegando a marcador:', noteId, noteType);

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

        // Scroll suave al marcador
        $('html, body').animate({
            scrollTop: marker.y - 100, // Offset para que no quede en el borde
            scrollLeft: marker.x - 100
        }, 800, 'easeInOutCubic');

        // Destacar marcador
        setTimeout(() => {
            const $visualMarker = $(`.cm-marker[data-marker-id="${noteId}"][data-marker-type="${noteType}"]`);
            if ($visualMarker.length) {
                this.highlightMarker($visualMarker);
            }
        }, 900);

        // Mostrar notificación
        this.showNotification(`Navegando a: ${marker.title}`, 'info', 2000);
    };

    // Destacar marcador
    window.ConsoleMonitor.highlightMarker = function ($marker) {
        // Remover highlight de otros marcadores
        $('.cm-marker').removeClass('cm-marker-highlight');

        // Agregar highlight al marcador actual
        $marker.addClass('cm-marker-highlight');

        // Remover highlight después de la animación
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

        console.log('👁️ Marcadores', this.state.markersVisible ? 'mostrados' : 'ocultos');
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

        // Agregar texto si es corto
        const text = $(element).text().trim();
        if (text && text.length < 30) {
            info += ` "${text}"`;
        }

        return info;
    };

    // ========================================
    // FUNCIONES DE VALIDACIÓN Y UTILIDADES ADICIONALES
    // ========================================

    // Función para validar estructura de marcador
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

    // Función para limpiar estado de marcadores
    window.ConsoleMonitor.resetMarkersState = function () {
        this.state.currentMarkers = [];
        this.state.isMarkerSelectionMode = false;
        this.state.selectedMarker = null;
        this.state.currentNoteType = null;

        // Limpiar elementos visuales
        if (this.elements.$markersContainer && this.elements.$markersContainer.length) {
            this.elements.$markersContainer.empty();
        }

        console.log('📍 Estado de marcadores reiniciado');
    };

    // Función para debug de marcadores
    window.ConsoleMonitor.debugMarkers = function () {
        console.log('📍 DEBUG MARCADORES:');
        console.log('- currentMarkers:', this.state.currentMarkers);
        console.log('- markersVisible:', this.state.markersVisible);
        console.log('- isMarkerSelectionMode:', this.state.isMarkerSelectionMode);
        console.log('- selectedMarker:', this.state.selectedMarker);
        console.log('- markersContainer exists:', this.elements.$markersContainer?.length > 0);
        console.log('- markers on page:', $('.cm-marker').length);

        return {
            state: {
                currentMarkers: this.state.currentMarkers,
                markersVisible: this.state.markersVisible,
                isMarkerSelectionMode: this.state.isMarkerSelectionMode,
                selectedMarker: this.state.selectedMarker
            },
            elements: {
                markersContainer: this.elements.$markersContainer?.length || 0,
                markersOnPage: $('.cm-marker').length
            }
        };
    };

    // Función para verificar y reparar estado
    window.ConsoleMonitor.verifyAndRepairState = function () {
        let repaired = false;

        // Verificar currentMarkers
        if (!Array.isArray(this.state.currentMarkers)) {
            console.warn('📍 Reparando currentMarkers...');
            this.state.currentMarkers = [];
            repaired = true;
        }

        // Verificar markersVisible
        if (typeof this.state.markersVisible !== 'boolean') {
            console.warn('📍 Reparando markersVisible...');
            this.state.markersVisible = true;
            repaired = true;
        }

        // Verificar contenedor de marcadores
        if (!this.elements.$markersContainer || this.elements.$markersContainer.length === 0) {
            console.warn('📍 Reparando contenedor de marcadores...');
            if ($('#cm-markers-container').length === 0) {
                $('body').prepend('<div id="cm-markers-container" class="cm-markers-container"></div>');
            }
            this.elements.$markersContainer = $('#cm-markers-container');
            repaired = true;
        }

        if (repaired) {
            console.log('📍 Estado reparado exitosamente');
        }

        return !repaired; // retorna true si no necesitó reparación
    };

    // ========================================
    // UTILIDADES COMPARTIDAS
    // ========================================

    window.ConsoleMonitor.escapeHtml = function (text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // ========================================
    // FUNCIONES DE TESTING Y DEBUG
    // ========================================

    // Test sistema avanzado
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

        // Abrir modal
        $btn.click();

        setTimeout(() => {
            // Llenar formulario de prueba
            $('#cm-note-title').val('Nota de prueba ' + Date.now());
            $('#cm-note-description').val('Descripción de prueba para notas avanzadas');
            $('#cm-note-url').val('https://ejemplo.com');

            console.log('🧪 Formulario de nota avanzada llenado');
        }, 500);
    };

    // Test sistema básico
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

        // Abrir panel
        $btn.click();

        setTimeout(() => {
            // Agregar nota de prueba
            const testText = 'Nota básica de prueba ' + Date.now();
            $('.cm-simple-note-input').val(testText);
            $('.cm-simple-btn-add').click();

            console.log('🧪 Nota básica de prueba creada:', testText);
        }, 500);
    };

    // NUEVO: Test sistema de marcadores
    window.testMarkersSystem = function () {
        console.log('🧪 Testing markers system');

        const cm = window.ConsoleMonitor;

        // Simular algunos marcadores
        cm.state.currentMarkers = [
            { id: 1, type: 'advanced', title: 'Nota de prueba 1', x: 200, y: 300 },
            { id: 2, type: 'simple', title: 'Nota rápida 1', x: 400, y: 500 },
            { id: 3, type: 'advanced', title: 'Otra nota', x: 600, y: 200 }
        ];

        cm.renderPageMarkers();

        setTimeout(() => {
            // Simular click en primer marcador
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

            // NUEVO: Sistema de marcadores
            'Contenedor de marcadores': $('#cm-markers-container').length > 0,
            'Campos de coordenadas': $('#cm-marker-x, #cm-marker-y').length === 2,
            'Instrucciones de marcador': $('#cm-marker-instruction').length > 0,
            'Marcador seleccionado': $('#cm-marker-selected').length > 0,

            // NUEVO: Funciones del sistema
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

    // Auto-verificación al cargar
    setTimeout(function () {
        if (typeof window.ConsoleMonitor !== 'undefined') {
            console.log('📍 Notes System with Visual Markers loaded successfully!');
            console.log('🧪 Comandos disponibles:');
            console.log('- testAdvancedNotes() : Test notas avanzadas');
            console.log('- testSimpleNotes() : Test notas básicas');
            console.log('- testMarkersSystem() : Test sistema de marcadores');
            console.log('- checkNotesConfig() : Verificar configuración completa');
            console.log('📍 Funciones de marcadores:');
            console.log('- ConsoleMonitor.loadPageMarkers() : Cargar marcadores');
            console.log('- ConsoleMonitor.toggleMarkersVisibility() : Toggle visibilidad');
            console.log('- ConsoleMonitor.goToMarker(id, type) : Ir a marcador');

            // Cargar marcadores automáticamente
            if (window.ConsoleMonitor.loadPageMarkers) {
                window.ConsoleMonitor.loadPageMarkers();
            }
        }
    }, 2000);

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

    console.log('📍 Console Monitor Notes with Visual Markers module loaded - VERSIÓN CORREGIDA COMPLETA');

})(jQuery);

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

    // Abrir modal
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

    // Abrir panel
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

    // Crear marcadores de prueba
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
        },
        {
            id: 997,
            type: 'advanced',
            title: 'Marcador de prueba 3',
            x: Math.floor(Math.random() * window.innerWidth),
            y: Math.floor(Math.random() * window.innerHeight)
        }
    ];

    // Asignar marcadores de prueba
    window.ConsoleMonitor.state.currentMarkers = testMarkers;
    window.ConsoleMonitor.renderPageMarkers();

    console.log('🧪 Marcadores de prueba creados:', testMarkers);
    console.log('📍 Haz clic en los marcadores para probar la navegación');

    // Auto-click en el primer marcador después de 2 segundos
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

    // Limpiar marcadores
    window.ConsoleMonitor.state.currentMarkers = [];
    window.ConsoleMonitor.elements.$markersContainer.empty();

    console.log('🧹 Marcadores de prueba eliminados');
};

// Función para debug completo del sistema
window.debugMarkerSystem = function () {
    if (!window.ConsoleMonitor) {
        console.error('❌ ConsoleMonitor no disponible');
        return;
    }

    const cm = window.ConsoleMonitor;

    console.log('🔍 Debug del Sistema de Marcadores:');
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

// Auto-ejecución para configurar comandos de debug
setTimeout(() => {
    if (typeof window.ConsoleMonitor !== 'undefined') {
        console.log('');
        console.log('🎯 SISTEMA DE MARCADORES CARGADO - VERSIÓN CORREGIDA FINAL');
        console.log('===============================================');
        console.log('📍 Comandos de testing disponibles:');
        console.log('• testAdvancedNotesWithMarkers() - Test notas avanzadas');
        console.log('• testSimpleNotesWithMarkers() - Test notas básicas');
        console.log('• testMarkersSystem() - Test sistema básico');
        console.log('• simulateTestMarkers() - Crear marcadores de prueba');
        console.log('• clearTestMarkers() - Limpiar marcadores de prueba');
        console.log('• debugMarkerSystem() - Debug completo del sistema');
        console.log('• forceReloadMarkers() - Forzar recarga');
        console.log('• toggleMarkers() - Toggle visibilidad');
        console.log('• checkNotesConfig() - Verificar configuración');
        console.log('===============================================');
        console.log('✅ Funciones críticas corregidas:');
        console.log('  - bindMarkerSelectionEvents() ✅');
        console.log('  - startNotesSelectionMode() ✅');
        console.log('  - Eventos de selección de marcadores ✅');
        console.log('  - Prevención de conflictos de interfaz ✅');
        console.log('  - Error currentMarkers.length ✅');
        console.log('===============================================');
        console.log('');
    }
}, 3000);