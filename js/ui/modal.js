// Diálogo propio, gestión de foco, aislamiento del fondo y cambio de pantalla.

import { nextFocusIndex } from '../engine.js';
import { BACKGROUND_REGIONS, IDS, byId, screenId } from '../dom.js';

export const supportsInert = typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;

let modalTrigger = null;
let modalConfirmHandler = null;
let modalCancelHandler = null;

const applyBackgroundInert = enabled => {
    if (!supportsInert) return;
    BACKGROUND_REGIONS.forEach(selector => {
        const region = document.querySelector(selector);
        if (region) region.inert = enabled;
    });
};

const focusActiveScreen = () => {
    document.querySelector('.screen.active')?.focus({ preventScroll: true });
};

const isVisible = element =>
    Boolean(element && element.isConnected && element.getClientRects().length > 0);

// Activa una pantalla, vuelve arriba y lleva allí el foco de lectores de pantalla.
export const switchScreen = screen => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = byId(screenId(screen));
    target?.classList.add('active');
    window.scrollTo(0, 0);
    target?.focus({ preventScroll: true });
};

// Cierra el diálogo y, si existe, ejecuta el callback opcional de cancelación.
const cancelModalHandler = () => {
    const onCancel = modalCancelHandler;
    closeModal(true);
    if (onCancel) onCancel();
};

const modalKeydownHandler = event => {
    if (event.key === 'Escape') {
        event.preventDefault();
        cancelModalHandler();
        return;
    }
    if (event.key !== 'Tab') return;

    const controls = [byId(IDS.MODAL_CANCEL), byId(IDS.MODAL_CONFIRM)];
    const current = controls.indexOf(document.activeElement);
    const next = nextFocusIndex(current === -1 ? 0 : current, controls.length, event.shiftKey);
    event.preventDefault();
    controls[next]?.focus({ preventScroll: true });
};

export const closeModal = (restoreFocus = true) => {
    const modal = byId(IDS.CUSTOM_MODAL);
    if (!modal || modal.hidden) return;

    const trigger = modalTrigger;
    modal.hidden = true;
    modal.classList.remove('active');
    applyBackgroundInert(false);
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', modalKeydownHandler);
    byId(IDS.MODAL_CANCEL)?.removeEventListener('click', cancelModalHandler);
    byId(IDS.MODAL_CONFIRM)?.removeEventListener('click', modalConfirmHandler);

    modalTrigger = null;
    modalConfirmHandler = null;
    modalCancelHandler = null;

    // Nunca dejar el foco en un diálogo que acaba de ocultarse.
    if (modal.contains(document.activeElement)) document.activeElement.blur();

    if (!restoreFocus) return;
    if (isVisible(trigger)) {
        trigger.focus({ preventScroll: true });
        return;
    }
    focusActiveScreen();
};

export const showModal = (title, msg, onConfirm, onCancel = null) => {
    const modal = byId(IDS.CUSTOM_MODAL);
    const btnConfirm = byId(IDS.MODAL_CONFIRM);
    const btnCancel = byId(IDS.MODAL_CANCEL);

    modalTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalConfirmHandler = () => {
        closeModal(false);
        onConfirm();
    };
    modalCancelHandler = typeof onCancel === 'function' ? onCancel : null;

    byId(IDS.MODAL_TITLE).textContent = title;
    byId(IDS.MODAL_MSG).textContent = msg;

    btnConfirm.addEventListener('click', modalConfirmHandler);
    btnCancel.addEventListener('click', cancelModalHandler);
    document.addEventListener('keydown', modalKeydownHandler);

    modal.hidden = false;
    modal.classList.add('active');
    applyBackgroundInert(true);
    document.body.classList.add('modal-open');
    btnConfirm.focus({ preventScroll: true });
};

// Aviso de una operación de almacenamiento que no se pudo completar.
export const showStorageError = (title, message) => showModal(title, message, () => {});
