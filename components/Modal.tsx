
import React, { Fragment, ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg scale-100 transform overflow-hidden rounded-2xl bg-white dark:bg-surface-dark p-6 text-left shadow-xl transition-all animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold leading-6 text-slate-900 dark:text-white" id="modal-title">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center size-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="mt-2 text-slate-600 dark:text-gray-300">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
