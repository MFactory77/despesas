
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { addMonths, subMonths } from 'date-fns';

interface DateContextType {
    selectedDate: Date;
    setDate: (date: Date) => void;
    prevMonth: () => void;
    nextMonth: () => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    const prevMonth = () => {
        setSelectedDate(prev => subMonths(prev, 1));
    };

    const nextMonth = () => {
        setSelectedDate(prev => addMonths(prev, 1));
    };

    return (
        <DateContext.Provider value={{ selectedDate, setDate: setSelectedDate, prevMonth, nextMonth }}>
            {children}
        </DateContext.Provider>
    );
};

export const useDate = () => {
    const context = useContext(DateContext);
    if (context === undefined) {
        throw new Error('useDate must be used within a DateProvider');
    }
    return context;
};
