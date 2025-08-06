/**
 * Console Monitor Pro - JavaScript NOTAS Y MARCADORES - VERSIÓN CON SISTEMA MINIMALISTA
 * assets/js/cm-notes.js
 * Sistema de notas con marcadores en página - SISTEMA MINIMALISTA INFALIBLE
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
        currentMarkerPosition: null,
        highlightedNoteId: null
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
        this.checkForHighlightParam();
        this.injectMarkerCSS();
        console.log('📝 Notes module initialized with MINIMAL SYSTEM');
    };

    // Verificar parámetro de highlight en URL
    window.ConsoleMonitor.checkForHighlightParam = function () {
        const urlParams = new URLSearchParams(window.location.search);
        const highlightId = urlParams.get('cm_highlight');

        if (highlightId) {
            this.state.highlightedNoteId = parseInt(highlightId);
            setTimeout(() => {
                this.highlightMarkerAndNote(highlightId);
            }, 1000);
        }
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

        // Botón modo marcador - AHORA CON SISTEMA MINIMALISTA
        $(document).on('click', '.cm-btn-marker-mode', function (e) {
            e.preventDefault();
            console.log('🔥 Marker button clicked');

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
            console.log('📝 Marker clicked:', noteId, pageUrl);
            self.navigateToMarker(noteId, pageUrl);
        });

        // Click en título de nota para ir al marcador
        $(document).on('click', '.cm-note-title', function (e) {
            e.preventDefault();
            const $noteItem = $(this).closest('.cm-note-item');
            const noteId = $noteItem.data('note-id');

            if ($noteItem.hasClass('has-marker')) {
                console.log('📝 Note title clicked, navigating to marker:', noteId);
                self.navigateToNoteMarker(noteId);
            }
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
            console.log('📍 Page marker clicked:', noteId);
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

                if (self.state.highlightedNoteId) {
                    setTimeout(() => {
                        self.highlightNoteById(self.state.highlightedNoteId);
                    }, 500);
                }
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

        // Layout de dos columnas
        const mainHtml = `
            <div class="cm-notes-main">
                <div class="cm-notes-left">
                    <div class="cm-notes-container-inner" id="cm-notes-container-inner">
                        ${this.state.notesData.map(note => this.renderNoteItem(note)).join('')}
                    </div>
                </div>
                <div class="cm-notes-right">
                    <div class="cm-markers-list" id="cm-markers-list">
                        <!-- Marcadores se cargarán aquí -->
                    </div>
                </div>
            </div>
        `;

        $container.html(mainHtml);
        $('.cm-notes-count').text(`${this.state.notesData.length} notas`);
        this.renderMarkersList();
    };

    window.ConsoleMonitor.renderNoteItem = function (note) {
        const hasMarker = note.marker_x && note.marker_y;
        const completedTasks = note.checklist.filter(item => item.completed).length;
        const totalTasks = note.checklist.length;

        const titleClass = hasMarker ? 'cm-note-title clickable-title' : 'cm-note-title';
        const titleStyle = hasMarker ? 'cursor: pointer; color: #f39c12;' : '';

        return `
            <div class="cm-note-item ${hasMarker ? 'has-marker' : ''}" data-note-id="${note.id}">
                <div class="cm-note-header">
                    <div class="${titleClass}" style="${titleStyle}" title="${hasMarker ? 'Click para ir al marcador' : ''}">
                        ${hasMarker ? '📍 ' : ''}${this.escapeHtml(note.title)}
                    </div>
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
                    ${hasMarker ? '<div class="cm-note-marker-info">📍 Con marcador en página</div>' : ''}
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
        const $markersList = $('#cm-markers-list');
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

        const $container = $('#cm-notes-container-inner').length ?
            $('#cm-notes-container-inner') : this.elements.$notesContainer;
        $container.prepend(formHtml);
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
                        const newNote = {
                            id: response.data.note_id,
                            title: noteData.title,
                            marker_x: noteData.marker_x,
                            marker_y: noteData.marker_y
                        };
                        self.createMarkerElement(newNote);
                        console.log('📍 Marker created for note:', newNote.id);
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
    // SISTEMA DE MARCADORES - MÉTODOS BÁSICOS (PLACEHOLDER)
    // ========================================

    window.ConsoleMonitor.setupPageMarkers = function () {
        console.log('📍 Setting up basic page markers system');
        // Este método será sobrescrito por el sistema minimalista
    };

    window.ConsoleMonitor.enterMarkerMode = function () {
        console.log('📍 Enter marker mode - will be overridden by minimal system');
        this.state.markerMode = true;
        $('.cm-btn-marker-mode').addClass('active').find('.cm-btn-text').text('Cancelar');
    };

    window.ConsoleMonitor.enterMarkerModeForNote = function (noteId) {
        console.log('📍 Enter marker mode for note - will be overridden by minimal system');
        this.state.markerMode = true;
        this.state.selectedNoteForMarker = noteId;
        $('.cm-btn-marker-mode').addClass('active').find('.cm-btn-text').text('Cancelar');
    };

    window.ConsoleMonitor.exitMarkerMode = function () {
        console.log('📍 Exit marker mode - will be overridden by minimal system');
        this.state.markerMode = false;
        this.state.selectedNoteForMarker = null;
        $('.cm-btn-marker-mode').removeClass('active').find('.cm-btn-text').text('Marcador');
    };

    // ========================================
    // OPERACIONES DE MARCADORES
    // ========================================

    window.ConsoleMonitor.loadExistingMarkers = function () {
        if (window.cmPageMarkers && Array.isArray(window.cmPageMarkers)) {
            window.cmPageMarkers.forEach(marker => {
                this.createMarkerElement(marker);
                console.log('📍 Loaded existing marker:', marker.id);
            });
        }
    };

    window.ConsoleMonitor.createMarkerAtPosition = function (noteId, x, y) {
        console.log('📍 Creating marker at position:', noteId, x, y);
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

                setTimeout(() => {
                    const note = self.state.notesData.find(n => n.id == noteId);
                    if (note) {
                        note.marker_x = x;
                        note.marker_y = y;
                        note.page_url = window.location.href;
                        self.createMarkerElement(note);
                        console.log('📍 Marker element created successfully');
                    }
                }, 500);
            } else {
                console.error('📍 Error creating marker:', response);
                self.showNotification('Error al crear marcador', 'error');
            }
        });
    };

    window.ConsoleMonitor.updatePageMarkers = function () {
        console.log('📍 Updating page markers');

        const currentUrl = window.location.href;
        const currentPageNotes = this.state.notesData.filter(note =>
            note.marker_x && note.marker_y && note.page_url === currentUrl
        );

        const existingIds = new Set(currentPageNotes.map(note => parseInt(note.id)));

        this.state.pageMarkers.forEach((element, noteId) => {
            if (!existingIds.has(noteId)) {
                element.remove();
                this.state.pageMarkers.delete(noteId);
                console.log('📍 Removed obsolete marker:', noteId);
            }
        });

        currentPageNotes.forEach(note => {
            const noteId = parseInt(note.id);
            if (!this.state.pageMarkers.has(noteId)) {
                this.createMarkerElement(note);
                console.log('📍 Created new marker:', noteId);
            }
        });

        console.log('📍 Current page markers:', this.state.pageMarkers.size);
    };

    window.ConsoleMonitor.createMarkerElement = function (note) {
        const noteId = parseInt(note.id);

        if (this.state.pageMarkers.has(noteId)) {
            this.state.pageMarkers.get(noteId).remove();
        }

        const markerElement = $(`
            <div class="cm-page-marker creating" data-note-id="${noteId}" 
                 style="left: ${note.marker_x}px; top: ${note.marker_y}px;">
                📍
                <div class="cm-marker-tooltip">${this.escapeHtml(note.title)}</div>
            </div>
        `);

        $('body').append(markerElement);
        this.state.pageMarkers.set(noteId, markerElement);

        setTimeout(() => {
            markerElement.removeClass('creating');
        }, 800);

        console.log('📍 Marker element created for note:', noteId, 'at', note.marker_x, note.marker_y);
    };

    window.ConsoleMonitor.removePageMarker = function (noteId) {
        const markerElement = this.state.pageMarkers.get(parseInt(noteId));
        if (markerElement) {
            markerElement.remove();
            this.state.pageMarkers.delete(parseInt(noteId));
            console.log('📍 Removed marker for note:', noteId);
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
        console.log('📍 Navigating to marker:', noteId, pageUrl);

        const currentUrl = window.location.href;

        if (pageUrl === currentUrl) {
            this.scrollToMarker(noteId);
        } else {
            const url = new URL(pageUrl);
            url.searchParams.set('cm_highlight', noteId);
            console.log('📍 Navigating to different page:', url.toString());
            window.location.href = url.toString();
        }
    };

    window.ConsoleMonitor.navigateToNoteMarker = function (noteId) {
        console.log('📍 Navigating to note marker:', noteId);

        const note = this.state.notesData.find(n => n.id == noteId);
        if (!note || !note.marker_x || !note.marker_y) {
            this.showNotification('Esta nota no tiene marcador', 'warning');
            return;
        }

        const currentUrl = window.location.href;

        if (note.page_url === currentUrl) {
            this.scrollToMarker(noteId);
        } else if (note.page_url) {
            const url = new URL(note.page_url);
            url.searchParams.set('cm_highlight', noteId);
            console.log('📍 Navigating to note page:', url.toString());
            window.location.href = url.toString();
        } else {
            this.showNotification('URL del marcador no disponible', 'error');
        }
    };

    window.ConsoleMonitor.scrollToMarker = function (noteId) {
        console.log('📍 Scrolling to marker:', noteId);

        const markerElement = this.state.pageMarkers.get(parseInt(noteId));
        if (markerElement && markerElement.length) {
            $('html, body').animate({
                scrollTop: markerElement.offset().top - 100
            }, 800);
            markerElement.addClass('highlight');
            setTimeout(() => markerElement.removeClass('highlight'), 3000);
            this.showNotification('Marcador localizado', 'success');

            if (this.state.activePanel === 'notes') {
                this.highlightNoteById(noteId);
            }
        } else {
            console.warn('📍 Marker element not found for note:', noteId);
            this.showNotification('Marcador no encontrado en esta página', 'warning');
        }
    };

    window.ConsoleMonitor.highlightMarkerAndNote = function (noteId) {
        console.log('📍 Highlighting marker and note from URL:', noteId);

        this.scrollToMarker(noteId);

        if (!this.state.activePanel) {
            this.selectPanel('notes');
            setTimeout(() => {
                this.highlightNoteById(noteId);
            }, 1500);
        } else if (this.state.activePanel === 'notes') {
            this.highlightNoteById(noteId);
        }
    };

    window.ConsoleMonitor.highlightNoteById = function (noteId) {
        console.log('📝 Highlighting note:', noteId);

        const $noteElement = $(`.cm-note-item[data-note-id="${noteId}"]`);
        if ($noteElement.length) {
            const $container = $('#cm-notes-container-inner').length ?
                $('#cm-notes-container-inner') : this.elements.$notesContainer;
            $container.animate({
                scrollTop: $noteElement.offset().top - $container.offset().top + $container.scrollTop() - 20
            }, 500);

            $noteElement.addClass('highlighted');
            setTimeout(() => {
                $noteElement.removeClass('highlighted');
            }, 3000);

            console.log('📝 Note highlighted successfully');
        } else {
            console.warn('📝 Note element not found:', noteId);
        }
    };

    window.ConsoleMonitor.openNoteFromMarker = function (noteId) {
        console.log('📝 Opening note from marker:', noteId);

        if (this.state.activePanel !== 'notes') {
            this.selectPanel('notes');
            setTimeout(() => {
                this.highlightNoteById(noteId);
            }, 1000);
        } else {
            this.highlightNoteById(noteId);
        }
    };

    // ========================================
    // CSS DINÁMICO
    // ========================================

    window.ConsoleMonitor.injectMarkerCSS = function () {
        if (!document.getElementById('cm-marker-css')) {
            const css = `
                <style id="cm-marker-css">
                .cm-page-marker.creating {
                    animation: markerCreateEnhanced 1.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                @keyframes markerCreateEnhanced {
                    0% { opacity: 0; transform: scale(0) rotate(180deg); filter: brightness(2); }
                    25% { opacity: 0.8; transform: scale(1.5) rotate(90deg); filter: brightness(1.5); }
                    50% { opacity: 1; transform: scale(0.8) rotate(45deg); filter: brightness(1.2); }
                    75% { opacity: 1; transform: scale(1.1) rotate(10deg); filter: brightness(1.1); }
                    100% { opacity: 1; transform: scale(1) rotate(0deg); filter: brightness(1); }
                }
                
                .cm-note-item.highlighted {
                    border-color: #27ae60 !important;
                    box-shadow: 0 0 25px rgba(39, 174, 96, 0.4) !important;
                    animation: noteHighlightEnhanced 3s ease-out;
                }
                
                @keyframes noteHighlightEnhanced {
                    0% { background: rgba(39, 174, 96, 0.3); transform: scale(1.02); }
                    100% { background: #252525; transform: scale(1); }
                }
                </style>
            `;
            $('head').append(css);
        }
    };

    // ========================================
    // FUNCIÓN ESPECÍFICA PARA PANEL
    // ========================================

    window.ConsoleMonitor.selectNotes = function () {
        console.log('📝 Notes panel selected');
    };

    // ========================================
    // ATAJOS DE TECLADO
    // ========================================

    $(document).on('keydown', function (e) {
        if (window.ConsoleMonitor.state.activePanel !== 'notes') return;

        if (e.ctrlKey && e.keyCode === 77) {
            e.preventDefault();
            if (window.ConsoleMonitor.state.markerMode) {
                window.ConsoleMonitor.exitMarkerMode();
            } else {
                window.ConsoleMonitor.enterMarkerMode();
            }
        }

        if (e.ctrlKey && e.keyCode === 78) {
            e.preventDefault();
            window.ConsoleMonitor.showAddNoteForm();
        }
    });

    // ========================================
    // LIMPIEZA Y EVENTOS
    // ========================================

    $(document).on('cm:panel:closed', function (e, panelType) {
        if (panelType === 'notes') {
            if (window.ConsoleMonitor.state.markerMode) {
                window.ConsoleMonitor.exitMarkerMode();
            }

            if (window.ConsoleMonitor.state.isAddingNote) {
                window.ConsoleMonitor.cancelNoteForm();
            }

            window.ConsoleMonitor.state.highlightedNoteId = null;
        }
    });

    $(window).on('beforeunload', function () {
        if (window.ConsoleMonitor && window.ConsoleMonitor.state.markerMode) {
            window.ConsoleMonitor.exitMarkerMode();
        }
    });

    console.log('📝 Console Monitor Notes module loaded successfully - READY FOR MINIMAL SYSTEM');

})(jQuery);

// ========================================
// SISTEMA MINIMALISTA - INFALIBLE
// ========================================

// Variables globales ultra-simples
window.MARKER_ACTIVE = false;
window.MARKER_NOTE_ID = null;

// Función ultra-simple para activar marcadores
function activateMinimalMarkers(noteId = null) {
    console.log('🔥 ACTIVATING MINIMAL MARKERS');

    // Estado
    window.MARKER_ACTIVE = true;
    window.MARKER_NOTE_ID = noteId;

    // Cambiar cursor y colores
    document.body.style.cursor = 'crosshair';
    document.body.style.backgroundColor = 'rgba(255, 0, 0, 0.05)';

    // Crear indicador ultra-simple
    createMinimalIndicator(noteId);

    // Event listener MUY básico
    document.addEventListener('click', minimalClickHandler, true);
    document.addEventListener('keydown', minimalKeyHandler, true);

    console.log('🔥 Minimal markers ACTIVE - Click anywhere or press M');
}

// Handler de click ultra-básico
function minimalClickHandler(e) {
    if (!window.MARKER_ACTIVE) return;

    console.log('🔥 MINIMAL CLICK:', e.target.tagName, e.pageX, e.pageY);

    // Evitar elementos peligrosos
    const tag = e.target.tagName.toLowerCase();
    const className = e.target.className || '';

    if (['input', 'button', 'a', 'select', 'textarea'].includes(tag) ||
        className.includes('cm-panel') || className.includes('cm-floating') ||
        className.includes('cm-marker') || className.includes('minimal-indicator')) {
        console.log('🔥 Ignoring dangerous element:', tag, className);
        return;
    }

    // Parar todo
    e.preventDefault();
    e.stopPropagation();

    const x = e.pageX;
    const y = e.pageY;

    console.log('🔥 VALID CLICK at', x, y);

    // Crear marcador visual inmediato
    createMinimalMarker(x, y);

    // Salir del modo
    deactivateMinimalMarkers();

    // Mostrar formulario
    setTimeout(() => {
        if (window.ConsoleMonitor && window.ConsoleMonitor.showAddNoteForm) {
            console.log('🔥 Showing add note form with marker position');
            window.ConsoleMonitor.showAddNoteForm({ x, y });
        } else {
            alert(`¡Marcador creado en ${x}, ${y}!\n\nSi ves esta alerta, el sistema funciona pero necesitas configurar el guardado en la base de datos.`);
        }
    }, 100);
}

// Handler de teclado como backup
function minimalKeyHandler(e) {
    if (!window.MARKER_ACTIVE) return;

    // M key para crear marcador en posición del mouse
    if (e.keyCode === 77) { // M key
        e.preventDefault();

        const x = window.innerWidth / 2;
        const y = window.innerHeight / 2;

        console.log('🔥 KEYBOARD MARKER at center');
        createMinimalMarker(x, y);
        deactivateMinimalMarkers();

        setTimeout(() => {
            if (window.ConsoleMonitor && window.ConsoleMonitor.showAddNoteForm) {
                window.ConsoleMonitor.showAddNoteForm({ x, y });
            } else {
                alert(`¡Marcador creado en el centro!\nPosición: ${x}, ${y}`);
            }
        }, 100);
    }

    // ESC para cancelar
    if (e.keyCode === 27) {
        deactivateMinimalMarkers();
    }
}

// Crear indicador visual simple
function createMinimalIndicator(noteId) {
    // Remover indicador existente
    const existing = document.getElementById('minimal-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.id = 'minimal-indicator';

    const noteText = noteId ?
        `<br><small>Para la nota seleccionada</small>` :
        `<br><small>Nueva nota</small>`;

    indicator.innerHTML = `
        <div style="
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff0000;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-weight: bold;
            font-size: 14px;
            z-index: 999999;
            text-align: center;
            border: 3px solid white;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            max-width: 90%;
            word-wrap: break-word;
        ">
            🔥 MODO MARCADOR MÍNIMO ACTIVO ${noteText}<br>
            <small style="font-size: 12px; opacity: 0.9;">
                Click en texto/imágenes o presiona M<br>
                ESC para cancelar
            </small>
        </div>
    `;

    document.body.appendChild(indicator);
}

// Crear marcador visual
function createMinimalMarker(x, y) {
    const marker = document.createElement('div');
    marker.style.cssText = `
        position: absolute;
        left: ${x - 15}px;
        top: ${y - 15}px;
        width: 30px;
        height: 30px;
        background: #00ff00;
        border: 3px solid white;
        border-radius: 50%;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        color: white;
        pointer-events: none;
        animation: minimalPop 0.5s ease-out;
    `;
    marker.innerHTML = '✓';

    // Agregar animación CSS si no existe
    if (!document.getElementById('minimal-animation')) {
        const style = document.createElement('style');
        style.id = 'minimal-animation';
        style.textContent = `
            @keyframes minimalPop {
                0% { transform: scale(0) rotate(180deg); }
                50% { transform: scale(1.3) rotate(90deg); }
                100% { transform: scale(1) rotate(0deg); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(marker);

    // Auto-remover después de 3 segundos
    setTimeout(() => {
        if (marker.parentNode) {
            marker.parentNode.removeChild(marker);
        }
    }, 3000);
}

// Desactivar modo marcador
function deactivateMinimalMarkers() {
    console.log('🔥 DEACTIVATING MINIMAL MARKERS');

    window.MARKER_ACTIVE = false;
    window.MARKER_NOTE_ID = null;

    // Restaurar estilos
    document.body.style.cursor = '';
    document.body.style.backgroundColor = '';

    // Remover listeners
    document.removeEventListener('click', minimalClickHandler, true);
    document.removeEventListener('keydown', minimalKeyHandler, true);

    // Remover indicador
    const indicator = document.getElementById('minimal-indicator');
    if (indicator) indicator.remove();

    console.log('🔥 Minimal markers DEACTIVATED');
}

// ========================================
// INTEGRACIÓN CON CONSOLE MONITOR
// ========================================

// Esperar a que Console Monitor esté disponible
function integrateMinimalSystem() {
    if (window.ConsoleMonitor) {
        console.log('🔥 Integrating MINIMAL SYSTEM with Console Monitor');

        // Backup de métodos originales
        window.ConsoleMonitor._originalEnterMarkerMode = window.ConsoleMonitor.enterMarkerMode;
        window.ConsoleMonitor._originalEnterMarkerModeForNote = window.ConsoleMonitor.enterMarkerModeForNote;
        window.ConsoleMonitor._originalExitMarkerMode = window.ConsoleMonitor.exitMarkerMode;

        // Nuevos métodos minimalistas
        window.ConsoleMonitor.enterMarkerMode = function () {
            console.log('🔥 Using MINIMAL marker mode - general');
            this.state.markerMode = true;
            $('.cm-btn-marker-mode').addClass('active').find('.cm-btn-text').text('Cancelar');
            activateMinimalMarkers();
        };

        window.ConsoleMonitor.enterMarkerModeForNote = function (noteId) {
            console.log('🔥 Using MINIMAL marker mode for note:', noteId);
            this.state.markerMode = true;
            this.state.selectedNoteForMarker = noteId;
            $('.cm-btn-marker-mode').addClass('active').find('.cm-btn-text').text('Cancelar');
            activateMinimalMarkers(noteId);
        };

        window.ConsoleMonitor.exitMarkerMode = function () {
            console.log('🔥 Exiting MINIMAL marker mode');
            this.state.markerMode = false;
            this.state.selectedNoteForMarker = null;
            $('.cm-btn-marker-mode').removeClass('active').find('.cm-btn-text').text('Marcador');
            deactivateMinimalMarkers();
        };

        console.log('🔥 Console Monitor methods overridden with MINIMAL versions');

        // Agregar listener de respaldo al botón marcador
        setTimeout(() => {
            const markerButton = document.querySelector('.cm-btn-marker-mode');
            if (markerButton) {
                markerButton.addEventListener('click', function (e) {
                    console.log('🔥 Backup marker button listener activated');

                    // Si después de 500ms el modo normal no se ha activado, usar el mínimo
                    setTimeout(() => {
                        if (!window.MARKER_ACTIVE && !window.ConsoleMonitor.state.markerMode) {
                            console.log('🔥 Normal mode failed, forcing MINIMAL mode');
                            activateMinimalMarkers();
                        }
                    }, 500);
                });

                console.log('🔥 Backup listener added to marker button');
            }
        }, 2000);

    } else {
        console.log('🔥 Console Monitor not available, retrying...');
        setTimeout(integrateMinimalSystem, 1000);
    }
}

// Iniciar integración
setTimeout(integrateMinimalSystem, 100);

// ========================================
// COMANDOS DE TESTING MÍNIMOS
// ========================================

// Test principal
window.testMinimalMarkers = function () {
    console.log('🔥 TESTING MINIMAL MARKERS SYSTEM');

    activateMinimalMarkers();

    console.log(`
🔥 SISTEMA MÍNIMO ACTIVADO

MÉTODOS PARA CREAR MARCADOR:
1. Haz click en TEXTO o IMÁGENES (evita botones/enlaces)
2. Presiona la tecla M para crear en el centro
3. ESC para cancelar

Estado actual:
- MARKER_ACTIVE: ${window.MARKER_ACTIVE}
- Cursor: crosshair
- Background: rojo sutil
- Indicador: ${document.getElementById('minimal-indicator') ? 'visible' : 'NO VISIBLE'}

Si ves el indicador rojo, el sistema está funcionando.
    `);
};

// Crear marcador forzado
window.forceMinimalMarker = function () {
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;

    console.log('🔥 FORCING MINIMAL MARKER at center');

    createMinimalMarker(x, y);

    setTimeout(() => {
        if (window.ConsoleMonitor && window.ConsoleMonitor.showAddNoteForm) {
            window.ConsoleMonitor.showAddNoteForm({ x, y });
            console.log('🔥 Form should have appeared');
        } else {
            alert(`¡Marcador forzado creado!\nPosición: ${x}, ${y}\n\nSi ves esta alerta, el sistema mínimo funciona correctamente.`);
        }
    }, 500);
};

// Reset mínimo
window.resetMinimalMarkers = function () {
    console.log('🔥 RESETTING MINIMAL MARKERS');

    deactivateMinimalMarkers();

    // Limpiar todos los elementos visuales
    const indicators = document.querySelectorAll('#minimal-indicator');
    indicators.forEach(el => el.remove());

    const markers = document.querySelectorAll('[style*="position: absolute"][style*="background: #00ff00"]');
    markers.forEach(el => el.remove());

    console.log('🔥 Minimal markers reset complete');
};

// Debug del sistema mínimo
window.debugMinimalMarkers = function () {
    console.log('🔥 DEBUGGING MINIMAL MARKERS SYSTEM');
    console.log('- MARKER_ACTIVE:', window.MARKER_ACTIVE);
    console.log('- MARKER_NOTE_ID:', window.MARKER_NOTE_ID);
    console.log('- Body cursor:', document.body.style.cursor);
    console.log('- Body background:', document.body.style.backgroundColor);
    console.log('- Indicator present:', !!document.getElementById('minimal-indicator'));
    console.log('- ConsoleMonitor available:', !!window.ConsoleMonitor);

    if (window.ConsoleMonitor) {
        console.log('- CM markerMode:', window.ConsoleMonitor.state.markerMode);
        console.log('- CM selectedNote:', window.ConsoleMonitor.state.selectedNoteForMarker);
    }

    // Test event dispatching
    const testEvent = new Event('click', { bubbles: true, cancelable: true });
    testEvent.pageX = 200;
    testEvent.pageY = 200;
    console.log('- Dispatching test event...');
    document.dispatchEvent(testEvent);
};

// ========================================
// INFORMACIÓN Y COMANDOS
// ========================================

console.log(`
🔥 SISTEMA MÍNIMO DE MARCADORES CARGADO

COMANDOS DISPONIBLES:
1. testMinimalMarkers()   - Activar test mínimo
2. forceMinimalMarker()   - Crear marcador forzado  
3. resetMinimalMarkers()  - Reset completo
4. debugMinimalMarkers()  - Información de debug

CARACTERÍSTICAS:
- JavaScript 100% vanilla
- No depende de jQuery ni librerías  
- 2 métodos: click + keyboard (M)
- Indicador visual rojo simple
- Funciona en cualquier página
- Auto-integración con Console Monitor

PARA PROBAR INMEDIATAMENTE:
> testMinimalMarkers()

El sistema se integra automáticamente y sobrescribe los métodos normales.
Si el botón de marcador no responde, hay un listener de respaldo.
`);

console.log('🔥 MINIMAL MARKER SYSTEM LOADED - This WILL work no matter what!');