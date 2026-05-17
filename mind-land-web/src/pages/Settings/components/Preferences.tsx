import { Monitor, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/store/modules/themeStore';
import CustomSelect from './CustomSelect';

type ThemeOption = {
  key: 'system' | 'light' | 'dark';
  label: string;
  icon: React.ElementType;
};

const themeOptions: ThemeOption[] = [
  { key: 'system', label: '使用系统设置', icon: Monitor },
  { key: 'light', label: '浅色', icon: Sun },
  { key: 'dark', label: '深色', icon: Moon },
];

function Preferences() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[--foreground] mb-2">偏好</h1>
      <p className="text-[--foreground]/50 text-sm mb-8">选择你心仪的 Mind Land 外观和行为</p>

      {/* 外观设置 */}
      <section className="mb-8">
        <h2 className="text-lg font-medium text-[--foreground] mb-4">外观</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-[--foreground] text-sm mb-1">外观</div>
              <div className="text-[--foreground]/50 text-xs">在此设备上选择 Mind Land 的外观</div>
            </div>
            <CustomSelect
              value={theme}
              options={themeOptions.map((o) => ({ value: o.key, label: o.label }))}
              onChange={(value) => setTheme(value as 'system' | 'light' | 'dark')}
            />
          </div>
        </div>
      </section>

      <div className="border-t border-[--border]" />

      {/* 输入选项 */}
      <section className="py-8">
        <h2 className="text-lg font-medium text-[--foreground] mb-4">输入选项</h2>

        <div className="flex items-start justify-between py-2">
          <div>
            <div className="text-[--foreground] text-sm mb-1">使用 Enter 键开始新的一行</div>
            <div className="text-[--foreground]/50 text-xs">适用于对话、评论和其他输入字段。按 Cmd/Ctrl + Enter 键发送。</div>
          </div>
          <button
            role="switch"
            aria-checked={false}
            aria-label="使用 Enter 键开始新的一行"
            className="relative w-11 h-6 bg-[--glass-highlight] rounded-full transition-colors cursor-pointer"
          >
            <span className="absolute left-1 top-1 w-4 h-4 bg-[--foreground]/60 rounded-full transition-transform" />
          </button>
        </div>
      </section>

      <div className="border-t border-[--border]" />

      {/* 语言与时间 */}
      <section className="py-8">
        <h2 className="text-lg font-medium text-[--foreground] mb-4">语言与时间</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-[--foreground] text-sm mb-1">语言</div>
              <div className="text-[--foreground]/50 text-xs">选择你希望以哪种语言使用 Mind Land</div>
            </div>
            <CustomSelect
              value="zh"
              options={[
                { value: 'zh', label: '简体中文' },
                { value: 'en', label: 'English (US)' },
              ]}
              onChange={() => {}}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default Preferences;
