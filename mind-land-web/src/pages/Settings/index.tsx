import { useState, useEffect, useRef } from 'react';
import { X, User, Sliders, Bell, Mail, Link2 } from 'lucide-react';
import Preferences from './components/Preferences';

type MenuItem = {
  key: string;
  label: string;
  icon: React.ElementType;
};

type MenuGroup = {
  title?: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    items: [
      { key: 'account', label: '帐号', icon: User },
    ],
  },
  {
    title: '工作空间',
    items: [
      { key: 'preferences', label: '偏好', icon: Sliders },
      { key: 'notifications', label: '通知', icon: Bell },
      { key: 'email-calendar', label: '邮箱和日历', icon: Mail },
      { key: 'connections', label: '连接', icon: Link2 },
    ],
  },
];

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

function Settings({ open, onClose }: SettingsProps) {
  const [activeKey, setActiveKey] = useState('preferences');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Focus first focusable element when modal opens
    const focusTimer = setTimeout(() => {
      if (modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  if (!open) return null;

  const renderContent = () => {
    switch (activeKey) {
      case 'preferences':
        return <Preferences />;
      case 'account':
        return (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <User className="w-12 h-12 text-[--foreground]/20 mb-4" />
            <h3 className="text-lg font-medium text-[--foreground]/70 mb-2">帐号</h3>
            <p className="text-sm text-[--foreground]/40">即将推出</p>
          </div>
        );
      case 'notifications':
        return (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <Bell className="w-12 h-12 text-[--foreground]/20 mb-4" />
            <h3 className="text-lg font-medium text-[--foreground]/70 mb-2">通知</h3>
            <p className="text-sm text-[--foreground]/40">即将推出</p>
          </div>
        );
      case 'email-calendar':
        return (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <Mail className="w-12 h-12 text-[--foreground]/20 mb-4" />
            <h3 className="text-lg font-medium text-[--foreground]/70 mb-2">邮箱和日历</h3>
            <p className="text-sm text-[--foreground]/40">即将推出</p>
          </div>
        );
      case 'connections':
        return (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <Link2 className="w-12 h-12 text-[--foreground]/20 mb-4" />
            <h3 className="text-lg font-medium text-[--foreground]/70 mb-2">连接</h3>
            <p className="text-sm text-[--foreground]/40">即将推出</p>
          </div>
        );
      default:
        return <Preferences />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="设置" className="relative z-10 w-[900px] h-[600px] max-w-[90vw] max-h-[90vh] bg-surface rounded-2xl border border-[--border] shadow-2xl flex overflow-hidden">
        {/* 左侧菜单 */}
        <aside className="w-[240px] min-w-[240px] flex flex-col border-r border-[--border]">
          <div className="flex items-center justify-between px-4 h-14 border-b border-[--border]">
            <span className="text-[--foreground] font-medium">设置</span>
            <button
              onClick={onClose}
              aria-label="关闭设置"
              className="p-1.5 rounded-lg text-[--foreground]/40 hover:text-foreground/80 hover:bg-hover transition-all duration-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {menuGroups.map((group, groupIndex) => (
            <div key={groupIndex} className={groupIndex > 0 ? 'mt-4' : ''}>
              {group.title && (
                <div className="px-4 py-2 text-xs text-[--foreground]/40 font-medium">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = activeKey === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveKey(item.key)}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-2 text-sm transition-all duration-200 cursor-pointer',
                      isActive
                        ? 'text-[#D4A574] bg-[rgba(212,165,116,0.08)]'
                        : 'text-[--foreground]/60 hover:text-foreground/90 hover:bg-hover',
                    ].join(' ')}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

        {/* 右侧内容区域 */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="max-w-[720px] mx-auto py-8 px-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Settings;
