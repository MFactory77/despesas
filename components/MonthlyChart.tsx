import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface MonthlyData {
    name: string; // Month name (Jan, Fev, etc.)
    total: number;
}

interface MonthlyChartProps {
    data: MonthlyData[];
    categories: { id: string; name: string }[];
    selectedCategoryId: string;
    onCategoryChange: (categoryId: string) => void;
    loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 p-3 rounded-lg shadow-lg">
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{label}</p>
                <p className="text-sm text-primary">
                    R$ {payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
            </div>
        );
    }
    return null;
};

const MonthlyChart: React.FC<MonthlyChartProps> = ({
    data,
    categories,
    selectedCategoryId,
    onCategoryChange,
    loading = false,
}) => {
    return (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Acompanhamento Mensal</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Evolução de gastos por categoria</p>
                </div>

                <div className="relative">
                    <select
                        value={selectedCategoryId}
                        onChange={(e) => onCategoryChange(e.target.value)}
                        className="appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2 pl-4 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        <option value="" disabled>Selecione uma categoria</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">bar_chart</span>
                        <p className="text-sm">Sem dados para o período</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                tickFormatter={(value) => `R$${value}`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#6366f1"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default MonthlyChart;
