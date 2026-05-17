import { useEffect, useState } from 'react';
import {
    Sparkles,
    Home,
    CheckCircle2,
    FileText,
    GitBranch,
    Layers,
    BookOpen,
    ListTree,
    Scissors,
    Search,
    Settings,
    Plus,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    List,
    Star,
    CheckSquare,
    Trash2,
} from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { postToDoListAPI } from '@/apis/layout';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchGetToDoLists } from '@/store/modules/toDoStore';
import { useToast } from '@/components/ToastProvider';
import ListItem from '@/pages/ToDo/components/List';
import SettingsModal from '@/pages/Settings';


// 导航菜单分组结构
// Group 1: Home
// Group 2: 待办、稿纸、脑图
// Group 3: 卡片笔记、日记、大纲笔记
// Group 4: 剪藏
const navGroups = [
    {
        items: [{ key: 'home', label: 'Home', icon: Home }],
    },
    {
        items: [
            { key: 'todo', label: '待办', icon: CheckCircle2 },
            { key: 'draft', label: '稿纸', icon: FileText },
            { key: 'mindmap', label: '脑图', icon: GitBranch },
        ],
    },
    {
        items: [
            { key: 'slipbox', label: '卡片笔记', icon: Layers },
            { key: 'diary', label: '日记', icon: BookOpen },
            { key: 'note', label: '大纲笔记', icon: ListTree },
        ],
    },
    {
        items: [{ key: 'marklist', label: '剪藏', icon: Scissors }],
    },
];

// 扁平化的导航项用于查找
const navItems = navGroups.flatMap(g => g.items);

const todoSystemLists = [
    { key: 'todo/all', label: '全部', icon: List },
    { key: 'todo/star', label: '星标', icon: Star },
    { key: 'todo/done', label: '已完成', icon: CheckSquare },
    { key: 'todo/bin', label: '回收站', icon: Trash2 },
];

function activeKeyFromPath(path: string): string {
    if (path === '/') return 'home';
    const seg = path.split('/').filter(Boolean);
    if (seg[0] === 'todo' && seg.length > 1) return `${seg[0]}/${seg[1]}`;
    return seg[0] || 'home';
}

function topKeyFromPath(path: string): string {
    const seg = path.split('/').filter(Boolean);
    return seg[0] || 'home';
}

function Container() {
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();
    const dispatch = useAppDispatch();

    const [expanded, setExpanded] = useState(false);
    const [pinned, setPinned] = useState(false);
    const [todoExpanded, setTodoExpanded] = useState(
        location.pathname.startsWith('/todo')
    );
    const [inputValue, setInputValue] = useState('');
    const [contentVisible, setContentVisible] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const loadingToDoLists = useAppSelector(state => state.toDo.loadingToDoLists);
    const toDoLists = useAppSelector(state => state.toDo.toDoLists);

    useEffect(() => {
        dispatch(fetchGetToDoLists());
    }, [dispatch]);

    const activeKey = activeKeyFromPath(location.pathname);
    const topKey = topKeyFromPath(location.pathname);
    const activeTop = topKey === 'todo' ? 'todo' : activeKey;

    const handleNav = (key: string) => {
        if (key === 'todo') {
            navigate('/todo/all');
            setTodoExpanded(!todoExpanded);
        } else {
            navigate(`/${key}`);
        }
    };

    const handleTodoSubNav = (key: string) => {
        navigate(`/${key}`);
    };

    const addToDoListName = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.stopPropagation();
        if (!inputValue.trim()) return;
        const { code, message, result } = await postToDoListAPI(inputValue);
        if (code === -1) {
            toast.error(message);
            console.error(result);
            return;
        }
        dispatch(fetchGetToDoLists());
        setInputValue('');
        toast.success('列表已创建');
    };

    // Module title mapping
    const moduleTitle = navItems.find(n => n.key === activeTop)?.label || 'Mind Land';

    // Content transition on route change
    useEffect(() => {
        setContentVisible(false);
        const t = setTimeout(() => setContentVisible(true), 50);
        return () => clearTimeout(t);
    }, [location.pathname]);

    if (loadingToDoLists) {
        return (
            <div className="h-screen w-screen bg-[--background] flex items-center justify-center text-[--foreground]/55 font-serif-display text-lg tracking-wide">
                Mind Land
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-[--background] flex overflow-hidden font-sans">
            {/* LEFT SIDEBAR */}
            <aside
                className="relative z-30 flex flex-col transition-[width] duration-[600ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                style={{
                    width: expanded ? 240 : 72,
                    minWidth: expanded ? 240 : 72,
                }}
            >
                {/* Glass background */}
                <div className="absolute inset-0 liquid-glass" />

                <div className="relative flex flex-col h-full py-4">
                    {/* Logo area */}
                    <div className="flex items-center px-5 h-12 mb-4 shrink-0">
                        <Sparkles className="w-5 h-5 text-[#D4A574] shrink-0" />
                        <span
                            className="ml-3 font-serif-display text-[--foreground] text-lg tracking-wide whitespace-nowrap transition-opacity duration-500"
                            style={{ opacity: expanded ? 1 : 0 }}
                        >
                            Mind Land
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2">
                        {navGroups.map((group, groupIndex) => (
                            <div key={groupIndex} className={groupIndex > 0 ? 'mt-4' : ''}>
                                {group.items.map(item => {
                                    const isTopActive = activeTop === item.key;
                                    const isTodo = item.key === 'todo';
                                    return (
                                        <div key={item.key}>
                                            <button
                                                onClick={() => handleNav(item.key)}
                                                className={[
                                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative group cursor-pointer',
                                                    isTopActive
                                                        ? 'text-[#D4A574]'
                                                        : 'text-[--foreground]/55 hover:text-[--foreground] hover:bg-[--hover]',
                                                ].join(' ')}
                                            >
                                                {/* Active glow */}
                                                {isTopActive && (
                                                    <div className="absolute inset-0 rounded-xl gold-glow opacity-60" />
                                                )}
                                                <item.icon
                                                    className={[
                                                        'w-[18px] h-[18px] shrink-0 transition-transform duration-500 relative z-10',
                                                        isTopActive ? 'scale-110' : 'group-hover:scale-105',
                                                    ].join(' ')}
                                                    strokeWidth={isTopActive ? 2.2 : 1.8}
                                                />
                                                <span
                                                    className="text-sm font-medium whitespace-nowrap relative z-10 transition-[opacity,transform] duration-500 ease-out"
                                                    style={{
                                                        opacity: expanded ? 1 : 0,
                                                        transform: expanded ? 'translateX(0)' : 'translateX(-6px)',
                                                    }}
                                                >
                                                    {item.label}
                                                </span>
                                                {isTodo && expanded && (
                                                    <ChevronDown
                                                        className="ml-auto w-3.5 h-3.5 transition-transform duration-300 text-[--foreground]/35"
                                                        style={{ transform: todoExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                                                    />
                                                )}
                                            </button>

                                            {/* Todo subnav */}
                                            {isTodo && todoExpanded && expanded && (
                                                <div className="mt-1 ml-2 space-y-0.5 pl-4 border-l border-[--border]">
                                                    {todoSystemLists.map(sub => {
                                                        const isSubActive = activeKey === sub.key;
                                                        const Icon = sub.icon;
                                                        return (
                                                            <button
                                                                key={sub.key}
                                                                onClick={() => handleTodoSubNav(sub.key)}
                                                                className={[
                                                                    'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all duration-200 cursor-pointer flex items-center gap-2',
                                                                    isSubActive
                                                                        ? 'text-[#D4A574] bg-[rgba(212,165,116,0.08)]'
                                                                        : 'text-[--foreground]/40 hover:text-[--foreground]/70 hover:bg-[--hover]',
                                                                ].join(' ')}
                                                            >
                                                                <Icon className="w-3 h-3 shrink-0" />
                                                                <span>{sub.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                    {/* 自定义列表与基础列表之间的分割线 */}
                                                    {toDoLists.length > 0 && (
                                                        <div className="my-1.5 border-t border-[--border]" />
                                                    )}
                                                    {toDoLists.map(item => {
                                                        const key = `todo/${item.id}`;
                                                        const isSubActive = activeKey === key;
                                                        return (
                                                            <div
                                                                key={key}
                                                                onClick={() => handleTodoSubNav(key)}
                                                                className={[
                                                                    'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all duration-200 cursor-pointer flex items-center gap-2',
                                                                    isSubActive
                                                                        ? 'text-[#D4A574] bg-[rgba(212,165,116,0.08)]'
                                                                        : 'text-[--foreground]/40 hover:text-[--foreground]/70 hover:bg-[--hover]',
                                                                ].join(' ')}
                                                            >
                                                                <ListItem item={item} />
                                                            </div>
                                                        );
                                                    })}
                                                    <input
                                                        type="text"
                                                        placeholder="新增列表…"
                                                        value={inputValue}
                                                        onChange={e => setInputValue(e.target.value)}
                                                        onBlur={() => {
                                                            setTimeout(() => {
                                                                if (document.activeElement?.tagName !== 'INPUT') {
                                                                    setInputValue('')
                                                                }
                                                            }, 200)
                                                        }}
                                                        onKeyDown={addToDoListName}
                                                        className="w-full px-3 py-1.5 rounded-lg text-xs bg-transparent text-[--foreground]/40 placeholder:text-[--foreground]/25 border border-transparent focus:border-[--border] outline-none transition-colors mt-1"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>

                    {/* Bottom toggle */}
                    <div className="px-2 mt-auto pt-4 pb-2 shrink-0">
                        <button
                            onClick={() => {
                                const newPinned = !pinned;
                                setPinned(newPinned);
                                setExpanded(newPinned);
                            }}
                            className="w-full h-10 flex items-center justify-center rounded-xl text-[--foreground]/35 hover:text-[--foreground]/70 hover:bg-[--hover] transition-all duration-300 cursor-pointer"
                            title={pinned ? '收起' : '展开'}
                        >
                            {pinned ? (
                                <ChevronLeft className="w-5 h-5" />
                            ) : (
                                <ChevronRight className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-w-0 bg-[--background]">
                {/* Top bar */}
                <header className="flex items-center justify-between px-6 h-14 shrink-0">
                    <h1 className="font-serif-display text-[--foreground] text-xl tracking-wide">
                        {moduleTitle}
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSearchOpen(!searchOpen)}
                            className="p-2 rounded-lg text-[--foreground]/40 hover:text-[--foreground]/80 hover:bg-[--hover] transition-all duration-200 cursor-pointer"
                            title="搜索"
                        >
                            <Search className="w-[18px] h-[18px]" />
                        </button>
                        <button
                            onClick={() => {
                                if (topKey === 'todo') navigate('/todo/all')
                                else if (topKey === 'slipbox') navigate('/slipbox')
                                else navigate('/slipbox')
                            }}
                            className="p-2 rounded-lg text-[--foreground]/40 hover:text-[--foreground]/80 hover:bg-[--hover] transition-all duration-200 cursor-pointer"
                            title="新建"
                        >
                            <Plus className="w-[18px] h-[18px]" />
                        </button>
                        <button
                            onClick={() => setSettingsOpen(true)}
                            className="p-2 rounded-lg text-[--foreground]/40 hover:text-[--foreground]/80 hover:bg-[--hover] transition-all duration-200 cursor-pointer"
                        >
                            <Settings className="w-[18px] h-[18px]" />
                        </button>
                    </div>
                </header>

                {/* Content area */}
                <div className="flex-1 overflow-hidden px-6 pb-6">
                    <div
                        className="h-full transition-all duration-250 ease-out"
                        style={{
                            opacity: contentVisible ? 1 : 0,
                            transform: contentVisible ? 'translateY(0)' : 'translateY(8px)',
                        }}
                    >
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Settings Modal */}
            <SettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />
        </div>
    );
}

export default Container