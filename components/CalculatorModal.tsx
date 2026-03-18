import React, { useState, useEffect } from 'react';

interface CalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    initialValue?: string;
}

const CalculatorModal: React.FC<CalculatorModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialValue = ''
}) => {
    const [display, setDisplay] = useState('0');
    const [expression, setExpression] = useState('');
    const [newNumber, setNewNumber] = useState(true);

    useEffect(() => {
        if (isOpen) {
            if (initialValue && !isNaN(parseFloat(initialValue.replace(',', '.')))) {
                setDisplay(initialValue.replace('.', ','));
                setExpression('');
                setNewNumber(true);
            } else {
                setDisplay('0');
                setExpression('');
                setNewNumber(true);
            }
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handleNumber = (num: string) => {
        if (newNumber) {
            setDisplay(num);
            setNewNumber(false);
        } else {
            setDisplay(display === '0' ? num : display + num);
        }
    };

    const handleOperator = (op: string) => {
        const currentVal = parseFloat(display.replace(',', '.'));
        setExpression(`${currentVal} ${op} `);
        setNewNumber(true);
    };

    const handleEqual = () => {
        try {
            // Unsafe eval replacement
            const currentVal = parseFloat(display.replace(',', '.'));
            const fullExpression = expression + currentVal;

            // Basic parser to avoid eval
            const parts = fullExpression.split(' ');
            if (parts.length === 3) {
                const n1 = parseFloat(parts[0]);
                const op = parts[1];
                const n2 = parseFloat(parts[2]);
                let res = 0;
                switch (op) {
                    case '+': res = n1 + n2; break;
                    case '-': res = n1 - n2; break;
                    case '*': res = n1 * n2; break;
                    case '/': res = n2 !== 0 ? n1 / n2 : 0; break;
                    default: res = n2;
                }
                setDisplay(res.toString().replace('.', ','));
                setExpression('');
                setNewNumber(true);
            }
        } catch (e) {
            setDisplay('Error');
            setNewNumber(true);
        }
    };

    const handleClear = () => {
        setDisplay('0');
        setExpression('');
        setNewNumber(true);
    };

    const handleDecimal = () => {
        if (newNumber) {
            setDisplay('0,');
            setNewNumber(false);
        } else if (!display.includes(',')) {
            setDisplay(display + ',');
        }
    };

    const handleBackspace = () => {
        if (display.length > 1) {
            setDisplay(display.slice(0, -1));
        } else {
            setDisplay('0');
            setNewNumber(true);
        }
    };

    const handleConfirm = () => {
        onConfirm(display);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800">

                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">calculate</span>
                        Calculadora
                    </h3>
                    <button
                        onClick={onClose}
                        className="size-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Display */}
                <div className="p-6 flex flex-col items-end gap-1 bg-white dark:bg-slate-900">
                    <div className="h-6 text-sm text-slate-400 font-medium">
                        {expression.replace('.', ',')}
                    </div>
                    <div className="text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                        {display}
                    </div>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-slate-800/30">
                    <button onClick={handleClear} className="col-span-1 h-14 rounded-2xl bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-lg hover:brightness-95 active:scale-95 transition-all">C</button>
                    <button onClick={handleBackspace} className="col-span-1 h-14 rounded-2xl bg-gray-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-lg hover:brightness-95 active:scale-95 transition-all flex items-center justify-center">
                        <span className="material-symbols-outlined">backspace</span>
                    </button>
                    <button onClick={() => handleOperator('/')} className="col-span-1 h-14 rounded-2xl bg-primary/10 text-primary font-bold text-xl hover:bg-primary/20 active:scale-95 transition-all">÷</button>
                    <button onClick={() => handleOperator('*')} className="col-span-1 h-14 rounded-2xl bg-primary/10 text-primary font-bold text-xl hover:bg-primary/20 active:scale-95 transition-all">×</button>

                    <button onClick={() => handleNumber('7')} className="h-14 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 active:scale-95 transition-all">7</button>
                    <button onClick={() => handleNumber('8')} className="h-14 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 active:scale-95 transition-all">8</button>
                    <button onClick={() => handleNumber('9')} className="h-14 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 active:scale-95 transition-all">9</button>
                    <button onClick={() => handleOperator('-')} className="col-span-1 h-14 rounded-2xl bg-primary/10 text-primary font-bold text-xl hover:bg-primary/20 active:scale-95 transition-all">-</button>

                    <button onClick={() => handleNumber('4')} className="h-14 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 active:scale-95 transition-all">4</button>
                    <button onClick={() => handleNumber('5')} className="h-14 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 active:scale-95 transition-all">5</button>
                    <button onClick={() => handleNumber('6')} className="h-14 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 active:scale-95 transition-all">6</button>
                    <button onClick={() => handleOperator('+')} className="col-span-1 h-14 rounded-2xl bg-primary/10 text-primary font-bold text-xl hover:bg-primary/20 active:scale-95 transition-all">+</button>

                    <button onClick={() => handleNumber('1')} className="h-14 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 active:scale-95 transition-all">1</button>
                    <button onClick={() => handleNumber('2')} className="h-14 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 active:scale-95 transition-all">2</button>
                    <button onClick={() => handleNumber('3')} className="h-14 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 active:scale-95 transition-all">3</button>
                    <button onClick={handleEqual} className="row-span-2 h-full rounded-2xl bg-primary text-white font-bold text-2xl hover:bg-primary-dark active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center justify-center">=</button>

                    <button onClick={() => handleNumber('0')} className="col-span-2 h-14 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 active:scale-95 transition-all">0</button>
                    <button onClick={handleDecimal} className="h-14 rounded-2xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 active:scale-95 transition-all">,</button>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={handleConfirm}
                        className="w-full h-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all"
                    >
                        Confirmar Valor
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CalculatorModal;
