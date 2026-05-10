import React, { useMemo } from 'react';
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts';
import { Expense, CategoryDefinition } from '../types';
import { GlassCard } from './GlassCard';
import { useCurrency } from '../contexts/CurrencyContext';

interface CashflowSankeyProps {
  expenses: Expense[];
  categories: CategoryDefinition[];
}

export const CashflowSankey: React.FC<CashflowSankeyProps> = ({ expenses, categories }) => {
  const { currencySymbol } = useCurrency();
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const data = useMemo(() => {
    if (expenses.length === 0) return { nodes: [], links: [] };

    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.categoryId] = (acc[expense.categoryId] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const activeCategories = categories.filter(c => categoryTotals[c.id] > 0);

    const nodes: any[] = [
      { name: 'Total Spent', fill: '#ffffff', categoryName: 'Total' }
    ];

    const links: any[] = [];

    activeCategories.forEach((c, idx) => {
      nodes.push({ name: c.name, fill: c.color, categoryName: c.name });
      links.push({
        source: 0,
        target: idx + 1,
        value: categoryTotals[c.id],
        categoryName: c.name,
      });
    });

    let nextNodeIndex = nodes.length;
    
    activeCategories.forEach((c, catIdx) => {
      const catExpenses = expenses
        .filter(e => e.categoryId === c.id)
        .sort((a, b) => b.amount - a.amount);
        
      const topCount = 3;
      const topExpenses = catExpenses.slice(0, topCount);
      const otherExpenses = catExpenses.slice(topCount);
      
      topExpenses.forEach(e => {
        nodes.push({ 
          name: e.description || 'Unnamed', 
          categoryName: c.name,
          fill: `${c.color}cc`
        });
        links.push({
          source: catIdx + 1,
          target: nextNodeIndex,
          value: e.amount,
          categoryName: c.name
        });
        nextNodeIndex++;
      });
      
      const otherTotal = otherExpenses.reduce((sum, e) => sum + e.amount, 0);
      if (otherTotal > 0) {
        nodes.push({ 
          name: `Other ${c.name}`, 
          categoryName: c.name,
          fill: `${c.color}88`
        });
        links.push({
          source: catIdx + 1,
          target: nextNodeIndex,
          value: otherTotal,
          categoryName: c.name
        });
        nextNodeIndex++;
      }
    });

    return { nodes, links };
  }, [expenses, categories]);

  if (expenses.length === 0) {
    return (
      <GlassCard className="p-6 text-center text-white/50">
        No data to display cashflow.
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 h-[600px] flex flex-col">
      <h3 className="mb-2 text-xl font-light text-white">Cashflow Analysis</h3>
      <p className="text-sm text-white/50 mb-6">Trace where your money goes, from total spending down to individual expenses.</p>
      
      <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div style={{ width: isMobile ? '150%' : '100%', height: '100%', minWidth: isMobile ? '500px' : 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={data}
            nodePadding={isMobile ? 20 : 40}
            nodeWidth={isMobile ? 16 : 24}
            linkCurvature={0.4}
            margin={{ left: 10, right: isMobile ? 80 : 120, top: 20, bottom: 20 }}
            link={{ stroke: '#ffffff', strokeOpacity: 0.15 }}
            node={({ x, y, width, height, index, payload }) => {
              const isLeftSide = x < (isMobile ? 30 : 50);
              // Expand the interaction area so tiny pills are easy to hover or tap
              const hitHeight = Math.max(height, 32);
              const hitY = height < 32 ? y - (32 - height) / 2 : y;
              
              return (
                <g style={{ cursor: 'pointer' }}>
                  {/* Invisible hit area */}
                  <rect
                    x={x - 15}
                    y={hitY}
                    width={width + 30}
                    height={hitHeight}
                    fill="transparent"
                  />
                  {/* Visual node */}
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={payload.fill || '#888'}
                    fillOpacity={0.9}
                    rx={2}
                    style={{ pointerEvents: 'none' }}
                  />
                  {height >= (isMobile ? 12 : 8) && (
                    <text
                      x={isLeftSide ? x + width + (isMobile ? 4 : 8) : x + width + (isMobile ? 4 : 8)}
                      y={y + height / 2}
                      textAnchor="start"
                      alignmentBaseline="middle"
                      fill="#ffffff"
                      fontSize={isMobile ? 9 : 11}
                      className="opacity-70 font-medium"
                      style={{ pointerEvents: 'none' }}
                    >
                      {payload.name && payload.name.length > (isMobile ? 12 : 20) 
                        ? `${payload.name.substring(0, isMobile ? 12 : 20)}...` 
                        : payload.name}
                    </text>
                  )}
                </g>
              );
            }}
          >
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const isNode = data.name !== undefined;
                  
                  return (
                    <div className="rounded-lg border border-white/10 bg-black/90 backdrop-blur-md p-4 text-white shadow-xl min-w-[150px] z-50">
                      {isNode ? (
                        <>
                          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                            {data.categoryName || 'Node'}
                          </p>
                          <p className="font-medium text-base mb-1 text-white/90">{data.name}</p>
                          <p className="text-xl font-light text-white">
                            {currencySymbol}{Number(data.value).toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                            {data.categoryName || 'Flow'}
                          </p>
                          <p className="text-sm font-medium opacity-90 mb-1 flex justify-between items-center gap-4">
                            <span className="text-white/60 truncate max-w-[100px]">{data.source?.name}</span>
                            <span className="text-white/40 text-[10px]">→</span>
                            <span className="truncate max-w-[100px]">{data.target?.name}</span>
                          </p>
                          <p className="text-xl font-light text-white mt-1">
                            {currencySymbol}{Number(data.value).toFixed(2)}
                          </p>
                        </>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
          </Sankey>
        </ResponsiveContainer>
        </div>
      </div>
    </GlassCard>
  );
};

