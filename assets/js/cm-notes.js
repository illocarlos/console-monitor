/**
 * Console Monitor Pro - JavaScript NOTAS Y MARCADORES
 * assets/js/cm-notes.js
 * Sistema de notas con marcadores en página 
 * Requiere: cm-core.js, jQuery
 */

(function ($) {
    'use strict';

    // Verificar dependencia
    if (!window.ConsoleMonitor) {
        console.error('CM Notes: ConsoleMonitor core no disponible');
        return;
    }

    // Extender estado base
    $.extend(window.ConsoleMonitor.state, {
        notesData: [],
        isAddingNote: false,
        selectedNoteForMarker: null,
        pageMarkers: new Map(),
        markerMode: false,
        currentMarkerPosition: null
    });

    // Extender elementos DOM
    $.extend(window.ConsoleMonitor.elements, {
        $notes: null,
        $notesContainer: null
    });

    // ========================================
    // INICIALIZACIÓN
    // ========================================

    const originalInit = window.ConsoleMonitor.init;
    window.ConsoleMonitor.init = function () {
        originalInit.call(this);
        this.initNotesModule();
    };

    const originalCacheElements = window.ConsoleMonitor.cacheElements;
    window.ConsoleMonitor.cacheElements = function () {
        originalCacheElements.call(this);
        this.elements.$notes = $('#cm-notes');
        this.elements.$notesContainer = $('#cm-notes-container');
    };

    window.ConsoleMonitor.initNotesModule = function () {
        this.bindNotesEvents();
        this.setupPageMarkers();
        this.loadExistingMarkers();
        console.log('📝 Notes module initialized');
    };

    // ========================================
    // EVENTOS
    // ========================================

    window.ConsoleMonitor.bindNotesEvents = function () {
        const self = this;

        // Panel abierto
        $(document).on('cm:panel:opened', function (e, panelType) {
            if (panelType === 'notes') {
                setTimeout(() => self.loadNotesFromDB(), 100);
            }
        });

        // Botón agregar nota
        $(document).on('click', '.cm-btn-add-note', function (e) {
            e.preventDefault();
            self.showAddNoteForm();
        });

        // Botón modo marcador
        $(document).on('click', '.cm-btn-marker-mode', function (e) {
            e.preventDefault();
            if (self.state.markerMode) {
                self.exitMarkerMode();
            } else {
                self.enterMarkerMode();
            }
        });

        // Click en marcadores de lista
        $(document).on('click', '.cm-marker-item', function (e) {
            e.preventDefault();
            const noteId = $(this).data('note-id');
            const pageUrl = $(this).data('page-url');
            self.navigateToMarker(noteId, pageUrl);
        });

        // Formulario
        $(document).on('click', '.cm-form-btn.primary', function (e) {
            e.preventDefault();
            if ($(this).closest('#cm-note-form').length) {
                self.submitNoteForm();
            }
        });

        $(document).on('click', '.cm-form-btn.secondary', function (e) {
            e.preventDefault();
            if ($(this).closest('#cm-note-form').length) {
                self.cancelNoteForm();
            }
        });

        // Acciones de notas
        $(document).on('click', '.cm-note-action-btn.marker', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = $(this).closest('.cm-note-item').data('note-id');
            self.toggleNoteMarker(noteId);
        });

        $(document).on('click', '.cm-note-action-btn.delete', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = $(this).closest('.cm-note-item').data('note-id');
            self.deleteNote(noteId);
        });

        // Checklist
        $(document).on('click', '.cm-checklist-checkbox', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = $(this).closest('.cm-note-item').data('note-id');
            const itemIndex = $(this).closest('.cm-checklist-item').index();
            self.toggleChecklistItem(noteId, itemIndex);
        });

        // Click en marcador de página
        $(document).on('click', '.cm-page-marker', function (e) {
            e.preventDefault();
            const noteId = $(this).data('note-id');
            self.openNoteFromMarker(noteId);
        });

        // Escape para salir del modo marcador
        $(document).on('keyup', function (e) {
            if (e.keyCode === 27 && self.state.markerMode) {
                self.exitMarkerMode();
            }
        });
    };

    // ========================================
    // GESTIÓN DE NOTAS
    // ========================================

    window.ConsoleMonitor.loadNotesFromDB = function () {
        const self = this;
        $.post(cmData.ajax_url, {
            action: 'cm_get_notes',
            nonce: cmData.nonce
        }, function (response) {
            if (response.success) {
                self.state.notesData = response.data.notes || [];
                self.renderNotes();
                self.updatePageMarkers();
            } else {
                self.showNotification('Error al cargar notas', 'error');
            }
        });
    };

    window.ConsoleMonitor.renderNotes = function () {
        const $container = this.elements.$notesContainer;
        if (!$container.length) return;

        if (this.state.notesData.length === 0) {
            $container.html(`
                <div class="cm-notes-empty">
                    <div class="cm-notes-empty-icon">📝</div>
                    <div class="cm-notes-empty-title">Sin notas aún</div>
                    <div class="cm-notes-empty-text">
                        Crea tu primera nota para empezar
                    </div>
                </div>
            `);
            $('.cm-notes-count').text('0 notas');
            return;
        }

        const notesHtml = this.state.notesData.map(note => this.renderNoteItem(note)).join('');
        $container.html(notesHtml);
        $('.cm-notes-count').text(`${this.state.notesData.length} notas`);
        this.renderMarkersList();
    };

    window.ConsoleMonitor.renderNoteItem = function (note) {
        const hasMarker = note.marker_x && note.marker_y;
        const completedTasks = note.checklist.filter(item => item.completed).length;
        const totalTasks = note.checklist.length;

        return `
            <div class="cm-note-item ${hasMarker ? 'has-marker' : ''}" data-note-id="${note.id}">
                <div class="cm-note-header">
                    <div class="cm-note-title">${this.escapeHtml(note.title)}</div>
                    <div class="cm-note-actions">
                        <button class="cm-note-action-btn marker ${hasMarker ? 'active' : ''}" title="Marcador">📍</button>
                        <button class="cm-note-action-btn delete" title="Eliminar">🗑️</button>
                    </div>
                </div>
                <div class="cm-note-content">
                    ${note.description ? `<div class="cm-note-description">${this.escapeHtml(note.description)}</div>` : ''}
                    ${note.checklist.length > 0 ? this.renderChecklist(note.checklist) : ''}
                </div>
                <div class="cm-note-footer">
                    <div class="cm-note-meta">
                        <span>📅 ${note.created_at}</span>
                        ${totalTasks > 0 ? `<span>✅ ${completedTasks}/${totalTasks}</span>` : ''}
                    </div>
                    ${hasMarker ? '<div class="cm-note-marker-info">📍 Con marcador</div>' : ''}
                </div>
            </div>
        `;
    };

    window.ConsoleMonitor.renderChecklist = function (checklist) {
        const checklistHtml = checklist.map((item, index) => `
            <div class="cm-checklist-item ${item.completed ? 'completed' : ''}" data-item-index="${index}">
                <div class="cm-checklist-checkbox ${item.completed ? 'checked' : ''}"></div>
                <div class="cm-checklist-text">${this.escapeHtml(item.text)}</div>
            </div>
        `).join('');
        return `<ul class="cm-note-checklist">${checklistHtml}</ul>`;
    };

    window.ConsoleMonitor.renderMarkersList = function () {
        const $markersList = $('.cm-markers-list');
        if (!$markersList.length) return;

        const notesWithMarkers = this.state.notesData.filter(note =>
            note.marker_x && note.marker_y && note.page_url
        );

        if (notesWithMarkers.length === 0) {
            $markersList.html(`
                <div class="cm-markers-title">📍 Marcadores (0)</div>
                <div style="padding: 20px; text-align: center; color: #7f8c8d; font-size: 11px;">
                    No hay marcadores
                </div>
            `);
            return;
        }

        const currentUrl = window.location.href;
        let markersHtml = `<div class="cm-markers-title">📍 Marcadores (${notesWithMarkers.length})</div>`;

        notesWithMarkers.forEach(note => {
            const isCurrentPage = note.page_url === currentUrl;
            const pageName = isCurrentPage ? 'Página actual' : this.getPageName(note.page_url);
            const pageClass = isCurrentPage ? 'current-page' : 'other-page';
            const indicator = isCurrentPage ? 'current' : 'other';

            markersHtml += `
                <div class="cm-marker-item ${pageClass}" data-note-id="${note.id}" data-page-url="${note.page_url}">
                    <div class="cm-marker-title">${this.escapeHtml(note.title)}</div>
                    <div class="cm-marker-page">
                        <span class="page-indicator ${indicator}"></span>
                        ${pageName}
                    </div>
                </div>
            `;
        });

        $markersList.html(markersHtml);
    };

    window.ConsoleMonitor.getPageName = function (url) {
        try {
            const urlObj = new URL(url);
            let pathname = urlObj.pathname;
            if (pathname === '/' || pathname === '') return 'Inicio';
            pathname = pathname.replace(/\.(php|html|htm)$/, '');
            const parts = pathname.split('/').filter(part => part.length > 0);
            const lastPart = parts[parts.length - 1] || 'Página';
            return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ');
        } catch (e) {
            return 'Otra página';
        }
    };

    // ========================================
    // FORMULARIOS
    // ========================================

    window.ConsoleMonitor.showAddNoteForm = function (markerPosition = null) {
        if (this.state.isAddingNote) return;
        this.state.isAddingNote = true;
        this.state.currentMarkerPosition = markerPosition;

        let markerInfo = '';
        if (markerPosition) {
            markerInfo = `
                <div class="cm-marker-info">
                    <span class="marker-icon">📍</span>
                    <span>Nota con marcador</span>
                    <span class="cm-marker-coordinates">(${markerPosition.x}, ${markerPosition.y})</span>
                </div>
            `;
        }

        const formHtml = `
            <div class="cm-note-form ${markerPosition ? 'with-marker' : ''}" id="cm-note-form">
                ${markerInfo}
                <div class="cm-form-group">
                    <label class="cm-form-label">Título</label>
                    <input type="text" class="cm-form-input" id="cm-note-title" placeholder="Título de la nota" maxlength="100">
                </div>
                <div class="cm-form-group">
                    <label class="cm-form-label">Descripción</label>
                    <textarea class="cm-form-textarea" id="cm-note-description" placeholder="Descripción opcional" maxlength="500"></textarea>
                </div>
                <div class="cm-form-group">
                    <label class="cm-form-label">Checklist</label>
                    <textarea class="cm-form-textarea" id="cm-note-checklist" placeholder="Una tarea por línea" rows="4"></textarea>
                </div>
                <div class="cm-form-actions">
                    <button class="cm-form-btn secondary">Cancelar</button>
                    <button class="cm-form-btn primary">Crear Nota</button>
                </div>
            </div>
        `;

        this.elements.$notesContainer.prepend(formHtml);
        $('#cm-note-title').focus();
    };

    window.ConsoleMonitor.submitNoteForm = function () {
        const title = $('#cm-note-title').val().trim();
        const description = $('#cm-note-description').val().trim();
        const checklistText = $('#cm-note-checklist').val().trim();

        if (!title) {
            this.showNotification('El título es requerido', 'error');
            return;
        }

        const checklist = checklistText ?
            checklistText.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map(text => ({ text, completed: false })) : [];

        const noteData = {
            title,
            description,
            checklist,
            url: window.location.href
        };

        if (this.state.currentMarkerPosition) {
            noteData.marker_x = this.state.currentMarkerPosition.x;
            noteData.marker_y = this.state.currentMarkerPosition.y;
            noteData.page_url = window.location.href;
        }

        this.saveNoteToDB(noteData);
    };

    window.ConsoleMonitor.cancelNoteForm = function () {
        $('#cm-note-form').remove();
        this.state.isAddingNote = false;
        this.state.currentMarkerPosition = null;
        if (this.state.markerMode) {
            this.exitMarkerMode();
        }
    };

    window.ConsoleMonitor.saveNoteToDB = function (noteData) {
        const self = this;
        $.post(cmData.ajax_url, {
            action: 'cm_save_note',
            nonce: cmData.nonce,
            note_data: JSON.stringify(noteData)
        }, function (response) {
            if (response.success) {
                self.cancelNoteForm();
                self.loadNotesFromDB();
                self.showNotification('Nota creada', 'success');

                if (noteData.marker_x && noteData.marker_y) {
                    setTimeout(() => {
                        self.createMarkerElement({
                            id: response.data.note_id,
                            title: noteData.title,
                            marker_x: noteData.marker_x,
                            marker_y: noteData.marker_y
                        });
                    }, 500);
                }
            } else {
                self.showNotification('Error al crear nota', 'error');
            }
        });
    };

    // ========================================
    // ACCIONES DE NOTAS
    // ========================================

    window.ConsoleMonitor.toggleChecklistItem = function (noteId, itemIndex) {
        const self = this;
        $.post(cmData.ajax_url, {
            action: 'cm_toggle_checklist_item',
            nonce: cmData.nonce,
            note_id: noteId,
            item_index: itemIndex
        }, function (response) {
            if (response.success) {
                self.loadNotesFromDB();
            }
        });
    };

    window.ConsoleMonitor.deleteNote = function (noteId) {
        if (!confirm('¿Eliminar esta nota?')) return;

        const self = this;
        $.post(cmData.ajax_url, {
            action: 'cm_delete_note',
            nonce: cmData.nonce,
            note_id: noteId
        }, function (response) {
            if (response.success) {
                self.removePageMarker(noteId);
                self.loadNotesFromDB();
                self.showNotification('Nota eliminada', 'success');
            }
        });
    };

    window.ConsoleMonitor.toggleNoteMarker = function (noteId) {
        const note = this.state.notesData.find(n => n.id == noteId);
        if (!note) return;

        if (note.marker_x && note.marker_y) {
            this.removeMarkerFromDB(noteId);
        } else {
            this.enterMarkerModeForNote(noteId);
        }
    };

    // ========================================
    // SISTEMA DE MARCADORES
    // ========================================

    window.ConsoleMonitor.setupPageMarkers = function () {
        const self = this;
        $(document).on('click', function (e) {
            if (self.state.markerMode && !$(e.target).closest('.cm-panel, .cm-floating-container, .cm-page-marker').length) {
                e.preventDefault();
                e.stopPropagation();

                const x = e.pageX;
                const y = e.pageY;

                if (self.state.selectedNoteForMarker) {
                    self.createMarkerAtPosition(self.state.selectedNoteForMarker, x, y);
                } else {
                    self.showAddNoteForm({ x, y });
                }
                self.exitMarkerMode();
            }
        });
    };

    window.ConsoleMonitor.loadExistingMarkers = function () {
        if (window.cmPageMarkers && Array.isArray(window.cmPageMarkers)) {
            window.cmPageMarkers.forEach(marker => {
                this.createMarkerElement(marker);
            });
        }
    };

    window.ConsoleMonitor.enterMarkerMode = function () {
        this.state.markerMode = true;
        this.state.selectedNoteForMarker = null;
        $('body').addClass('cm-marker-mode');
        $('.cm-btn-marker-mode').addClass('active').find('.cm-btn-text').text('Cancelar');
        this.showNotification('Modo marcador activo - Haz click en la página', 'info');
    };

    window.ConsoleMonitor.enterMarkerModeForNote = function (noteId) {
        this.state.markerMode = true;
        this.state.selectedNoteForMarker = noteId;
        $('body').addClass('cm-marker-mode');
        $('.cm-btn-marker-mode').addClass('active').find('.cm-btn-text').text('Cancelar');

        const note = this.state.notesData.find(n => n.id == noteId);
        const noteTitle = note ? note.title : 'esta nota';
        this.showNotification(`Haz click para marcar "${noteTitle}"`, 'info');
    };

    window.ConsoleMonitor.exitMarkerMode = function () {
        this.state.markerMode = false;
        this.state.selectedNoteForMarker = null;
        $('body').removeClass('cm-marker-mode');
        $('.cm-btn-marker-mode').removeClass('active').find('.cm-btn-text').text('Marcador');
    };

    window.ConsoleMonitor.createMarkerAtPosition = function (noteId, x, y) {
        const self = this;
        $.post(cmData.ajax_url, {
            action: 'cm_save_marker',
            nonce: cmData.nonce,
            note_id: noteId,
            marker_x: x,
            marker_y: y,
            page_url: window.location.href
        }, function (response) {
            if (response.success) {
                self.loadNotesFromDB();
                self.showNotification('Marcador creado', 'success');

                const note = self.state.notesData.find(n => n.id == noteId);
                if (note) {
                    note.marker_x = x;
                    note.marker_y = y;
                    self.createMarkerElement(note);
                }
            }
        });
    };

    window.ConsoleMonitor.updatePageMarkers = function () {
        $('.cm-page-marker').remove();
        this.state.pageMarkers.clear();

        const currentUrl = window.location.href;
        this.state.notesData.forEach(note => {
            if (note.marker_x && note.marker_y && note.page_url === currentUrl) {
                this.createMarkerElement(note);
            }
        });
    };

    window.ConsoleMonitor.createMarkerElement = function (note) {
        if (this.state.pageMarkers.has(parseInt(note.id))) {
            this.state.pageMarkers.get(parseInt(note.id)).remove();
        }

        const markerElement = $(`
            <div class="cm-page-marker" data-note-id="${note.id}" 
                 style="left: ${note.marker_x}px; top: ${note.marker_y}px;">
                📍
                <div class="cm-marker-tooltip">${this.escapeHtml(note.title)}</div>
            </div>
        `);

        $('body').append(markerElement);
        this.state.pageMarkers.set(parseInt(note.id), markerElement);
    };

    window.ConsoleMonitor.removePageMarker = function (noteId) {
        const markerElement = this.state.pageMarkers.get(parseInt(noteId));
        if (markerElement) {
            markerElement.remove();
            this.state.pageMarkers.delete(parseInt(noteId));
        }
    };

    window.ConsoleMonitor.removeMarkerFromDB = function (noteId) {
        const self = this;
        $.post(cmData.ajax_url, {
            action: 'cm_remove_marker',
            nonce: cmData.nonce,
            note_id: noteId
        }, function (response) {
            if (response.success) {
                self.removePageMarker(noteId);
                self.loadNotesFromDB();
                self.showNotification('Marcador eliminado', 'success');
            }
        });
    };

    // ========================================
    // NAVEGACIÓN
    // ========================================

    window.ConsoleMonitor.navigateToMarker = function (noteId, pageUrl) {
        const currentUrl = window.location.href;
        if (pageUrl === currentUrl) {
            this.scrollToMarker(noteId);
        } else {
            const url = new URL(pageUrl);
            url.searchParams.set('cm_highlight', noteId);
            window.location.href = url.toString();
        }
    };

    window.ConsoleMonitor.scrollToMarker = function (noteId) {
        const markerElement = this.state.pageMarkers.get(parseInt(noteId));
        if (markerElement && markerElement.length) {
            $('html, body').animate({
                scrollTop: markerElement.offset().top - 100
            }, 800);
            markerElement.addClass('highlight');
            setTimeout(() => markerElement.removeClass('highlight'), 3000);
            this.showNotification('Marcador localizado', 'success');
        }
    };

    window.ConsoleMonitor.openNoteFromMarker = function (noteId) {
        if (this.state.activePanel !== 'notes') {
            this.selectPanel('notes');
            setTimeout(() => this.scrollToNote(noteId), 1000);
        } else {
            this.scrollToNote(noteId);
        }
    };

    window.ConsoleMonitor.scrollToNote = function (noteId) {
        const $noteElement = $(`.cm-note-item[data-note-id="${noteId}"]`);
        if ($noteElement.length) {
            this.elements.$notesContainer.animate({
                scrollTop: $noteElement.offset().top - this.elements.$notesContainer.offset().top + this.elements.$notesContainer.scrollTop() - 20
            }, 500);
        }
    };

    // ========================================
    // FUNCIÓN ESPECÍFICA PARA PANEL
    // ========================================

    window.ConsoleMonitor.selectNotes = function () {
        console.log('📝 Notes panel selected');
    };

    console.log('📝 Console Monitor Notes module loaded successfully');

})(jQuery);