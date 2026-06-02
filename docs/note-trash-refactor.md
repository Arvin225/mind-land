# 大纲笔记模块回收站功能重构方案

## 一、现状分析

### 1.1 架构概览

大纲笔记（Note）模块采用三层架构：

| 层级 | 技术栈 | 说明 |
|------|--------|------|
| **前端** | React 19 + TypeScript + Redux Toolkit | TipTap 富文本编辑，Redux 状态管理 |
| **后端** | Go 1.26 + Gin + GORM | RESTful API 设计 |
| **数据库** | SQLite (glebarez/sqlite) | 文件型数据库 `mind-land.db` |

数据模型关系：
- `OutlineFolder` → 文件夹（支持嵌套，`parentId` 实现树结构）
- `OutlineDocument` → 文档（属于文件夹，`folderId` 关联）
- `OutlineNode` → 大纲节点（属于文档，`documentId` 关联，支持嵌套）
- `OutlineDocumentVersion` → 文档版本快照

所有模型都有 `del` 布尔字段实现软删除。

### 1.2 回收站功能现状

**后端 API 实现完整度较高**，已具备回收站的核心操作：

| 操作 | API 端点 | Service 方法 | 状态 |
|------|----------|-------------|------|
| 软删除文档 | `DELETE /outline/documents/:id` | `DeleteDocument` | ✅ 已实现 |
| 软删除文件夹 | `DELETE /outline/folders/:id` | `DeleteFolder` | ⚠️ 有缺陷 |
| 查询回收站文档 | `GET /outline/documents?trash=true` | `GetTrashDocuments` | ✅ 已实现 |
| 查询回收站文件夹 | `GET /outline/folders?trash=true` | `GetTrashFolders` | ✅ 已实现 |
| 恢复文档 | `PATCH /outline/documents/:id/restore` | `RestoreDocument` | ✅ 已实现 |
| 恢复文件夹 | `PATCH /outline/folders/:id/restore` | `RestoreFolder` | ⚠️ 有缺陷 |
| 永久删除文档 | `DELETE /outline/documents/:id/permanent` | `PermanentDeleteDocument` | ✅ 已实现 |
| 永久删除文件夹 | `DELETE /outline/folders/:id/permanent` | `PermanentDeleteFolder` | ⚠️ 有缺陷 |
| 清空回收站 | `DELETE /outline/trash` | `EmptyTrash` | ✅ 已实现 |

**前端 API 层已完整定义**（`mind-land-web/src/apis/outline.ts`）：

```typescript
// ── Trash API（已定义但未被 UI 调用）──
export function getTrashFolders() { ... }
export function getTrashDocuments() { ... }
export function restoreDocument(id) { ... }
export function restoreFolder(id) { ... }
export function permanentDeleteDocument(id) { ... }
export function permanentDeleteFolder(id) { ... }
export function emptyTrash() { ... }
```

**关键发现：后端 API 层和前端 API 定义都已经完整，但前端 UI 没有对接这些功能。**

---

## 二、已识别的问题

### 2.1 问题汇总

| # | 问题 | 严重程度 | 层级 | 影响 |
|---|------|---------|------|------|
| 1 | 回收站不显示已删除的文件夹 | 🔴 严重 | 前端 | 用户无法看到和恢复已删除的文件夹 |
| 2 | 回收站中无恢复/永久删除/清空操作 | 🔴 严重 | 前端 | 回收站变成只读视图，无法操作 |
| 3 | 删除文件夹不级联软删除子文档 | 🔴 严重 | 后端 | 删除文件夹后其内文档仍可见，数据不一致 |
| 4 | 恢复文件夹不级联恢复子文档 | 🟡 中等 | 后端 | 恢复文件夹后子文档仍在回收站 |
| 5 | 永久删除文件夹漏删已软删除的子文档 | 🟡 中等 | 后端 | 孤儿数据残留 |
| 6 | EmptyTrash 处理顺序依赖 | 🟢 低 | 后端 | 潜在的数据一致性风险 |
| 7 | 回收站标题显示为「我的文档」 | 🟢 低 | 前端 | UI 文案不正确 |

### 2.2 问题详细分析

#### 问题 1：回收站不显示已删除的文件夹（严重）

**位置**: `mind-land-web/src/pages/Note/FolderTreePanel.tsx` (L186-L201)

点击「回收站」导航项时，只调用了：
```typescript
dispatch(fetchDocumentsAction({
  page: 1, size: 50, trash: true,
}));
```
**缺失**：没有调用 `getTrashFolders()` 或 `fetchFoldersAction(true)`，导致已删除的文件夹在回收站中完全不可见。

**影响**：用户删除文件夹后无法在回收站找到它，也无法恢复。

---

#### 问题 2：回收站中无恢复/永久删除/清空操作（严重）

**位置**: `mind-land-web/src/pages/Note/ContentList.tsx` (L198-L221)

`ContentList` 组件的 `resolveContextMenuItems()` 函数不区分 `currentView`：

```typescript
// 无论什么视图，文档右键菜单始终显示：
return [
  { label: "打开", onClick: () => handleOpenDocument(doc) },
  { label: "重命名", onClick: () => handleRenameDocument(doc) },
  { label: "复制", onClick: () => handleDuplicateDocument(doc) },
  { label: doc.isFavorite ? "取消收藏" : "收藏", onClick: () => handleFavoriteDocument(doc) },
  { label: "删除", onClick: () => handleDeleteDocument(doc), danger: true },
];
```

**缺失**：当 `currentView === "trash"` 时，菜单应显示：
- ✅ 恢复（调用 `restoreDocument` / `restoreFolder`）
- 🗑️ 永久删除（调用 `permanentDeleteDocument` / `permanentDeleteFolder`）
- 🧹 清空回收站（调用 `emptyTrash`，应放在工具栏）

**影响**：回收站中的文档无法被恢复或永久删除，用户只能看着它们。

---

#### 问题 3：删除文件夹不级联软删除子文档（严重）

**位置**: `mind-land-server/outline/service.go` (L48-L50)

```go
func (s *Service) DeleteFolder(id uint) error {
    return s.db.Model(&OutlineFolder{}).Where("id = ?", id).Update("del", true).Error
}
```

**问题**：只设置文件夹自身 `del=true`，不处理：
- 子文件夹（`parentId` 指向该文件夹的）
- 文件夹内的文档（`folderId` 指向该文件夹的）
- 文档内的节点

**对比**：`DeleteDocument` 会同时软删除关联的所有 nodes：
```go
func (s *Service) DeleteDocument(id uint) error {
    s.db.Model(&OutlineDocument{}).Where("id = ?", id).Update("del", true)
    return s.db.Model(&OutlineNode{}).Where("document_id = ?", id).Update("del", true).Error
}
```

**影响**：删除文件夹后，其中的文档在正常视图中仍然可见（因为 `del=false`），造成数据不一致。

---

#### 问题 4：恢复文件夹不级联恢复子文档

**位置**: `mind-land-server/outline/service.go` (L286-L288)

```go
func (s *Service) RestoreFolder(id uint) error {
    return s.db.Model(&OutlineFolder{}).Where("id = ?", id).Update("del", false).Error
}
```

**问题**：只恢复文件夹自身，不恢复：
- 子文件夹
- 文件夹内的文档
- 文档内的节点

**对比**：`RestoreDocument` 会同时恢复文档及其所有节点：
```go
func (s *Service) RestoreDocument(id uint) error {
    // ... 恢复文档
    return tx.Model(&OutlineNode{}).Where("document_id = ?", id).Update("del", false).Error
}
```

**影响**：恢复文件夹后，子文件夹和文档仍在回收站中，需要逐个手动恢复。

---

#### 问题 5：永久删除文件夹漏删已软删除的子文档

**位置**: `mind-land-server/outline/service.go` (L302-L321)

```go
func (s *Service) PermanentDeleteFolder(id uint) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        var docIDs []uint
        // 只查询 del=false 的文档！
        tx.Model(&OutlineDocument{}).Where("folder_id = ? AND del = ?", id, false).Pluck("id", &docIDs)
        // ... 删除这些文档
    })
}
```

**问题**：查询条件 `del = false` 会排除已经被单独软删除的文档。

**场景**：
1. 用户删除文档 A（A.del = true）
2. 用户删除文件夹 F（F.del = true），A 仍在 F 中
3. 用户永久删除文件夹 F
4. 文档 A 不会被永久删除，成为孤儿数据

---

#### 问题 6：EmptyTrash 处理顺序依赖

**位置**: `mind-land-server/outline/service.go` (L323-L362)

```go
func (s *Service) EmptyTrash() error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 第一步：删除 del=true 的文档
        var trashDocIDs []uint
        tx.Model(&OutlineDocument{}).Where("del = ?", true).Pluck("id", &trashDocIDs)
        // ... 删除这些文档和它们的节点、版本

        // 第二步：删除 del=true 的文件夹及其内文档
        var trashFolderIDs []uint
        tx.Model(&OutlineFolder{}).Where("del = ?", true).Pluck("id", &trashFolderIDs)
        // ... 删除文件夹内的文档（不限 del 状态）
    })
}
```

**问题**：
- 第一步删除所有 `del=true` 的文档
- 第二步删除 `del=true` 的文件夹，并尝试删除其中的文档
- 如果文件夹中有 `del=false` 的文档（问题 3 导致），它们会在第二步被删除
- 但如果问题 3 被修复（删除文件夹时级联设置 del=true），第二步的查询会重复处理已在第一步删除的文档

**影响**：虽然当前实现在事务内运行不会出错，但逻辑上依赖执行顺序，较为脆弱。

---

#### 问题 7：回收站标题显示为「我的文档」

**位置**: `mind-land-web/src/pages/Note/ContentToolbar.tsx` (L21-L25)

```typescript
const folderName = useMemo(() => {
    if (currentFolderId === null) return "我的文档";
    const folder = folders.find((f) => f.id === currentFolderId);
    return folder?.name || "我的文档";
}, [currentFolderId, folders]);
```

**问题**：当 `currentView === "trash"` 且 `currentFolderId === null` 时，标题显示为「我的文档」而不是「回收站」。

---

## 三、重构方案

### 3.1 总体原则

1. **最小化改动**：后端 API 已基本完整，主要修复逻辑缺陷
2. **数据一致性优先**：确保级联操作的正确性
3. **渐进式实现**：按严重程度分批处理
4. **测试覆盖**：后端已有 `trash_test.go`，需要扩展测试用例

### 3.2 后端修复方案

#### 3.2.1 修复 DeleteFolder 级联软删除（问题 3）

**文件**: `mind-land-server/outline/service.go`

```go
func (s *Service) DeleteFolder(id uint) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1. 递归收集所有子文件夹 ID（含自身）
        folderIDs, err := s.collectFolderAndDescendants(tx, id)
        if err != nil {
            return err
        }

        // 2. 软删除所有文件夹
        if err := tx.Model(&OutlineFolder{}).
            Where("id IN ?", folderIDs).
            Update("del", true).Error; err != nil {
            return err
        }

        // 3. 收集所有相关文档 ID
        var docIDs []uint
        tx.Model(&OutlineDocument{}).
            Where("folder_id IN ?", folderIDs).
            Pluck("id", &docIDs)

        if len(docIDs) > 0 {
            // 4. 软删除所有文档
            if err := tx.Model(&OutlineDocument{}).
                Where("id IN ?", docIDs).
                Update("del", true).Error; err != nil {
                return err
            }

            // 5. 软删除所有文档的节点
            if err := tx.Model(&OutlineNode{}).
                Where("document_id IN ?", docIDs).
                Update("del", true).Error; err != nil {
                return err
            }
        }

        return nil
    })
}
```

**需要新增辅助方法**：
```go
func (s *Service) collectFolderAndDescendants(tx *gorm.DB, rootID uint) ([]uint, error) {
    var result []uint
    result = append(result, rootID)

    var children []OutlineFolder
    if err := tx.Where("parent_id = ?", rootID).Find(&children).Error; err != nil {
        return nil, err
    }
    for _, child := range children {
        descendants, err := s.collectFolderAndDescendants(tx, child.ID)
        if err != nil {
            return nil, err
        }
        result = append(result, descendants...)
    }
    return result, nil
}
```

#### 3.2.2 修复 RestoreFolder 级联恢复（问题 4）

**文件**: `mind-land-server/outline/service.go`

```go
func (s *Service) RestoreFolder(id uint) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1. 恢复文件夹自身
        if err := tx.Model(&OutlineFolder{}).Where("id = ?", id).Update("del", false).Error; err != nil {
            return err
        }

        // 2. 恢复文件夹内的文档和节点
        var docIDs []uint
        tx.Model(&OutlineDocument{}).Where("folder_id = ?", id).Pluck("id", &docIDs)
        if len(docIDs) > 0 {
            if err := tx.Model(&OutlineDocument{}).
                Where("id IN ?", docIDs).
                Update("del", false).Error; err != nil {
                return err
            }
            if err := tx.Model(&OutlineNode{}).
                Where("document_id IN ?", docIDs).
                Update("del", false).Error; err != nil {
                return err
            }
        }

        return nil
    })
}
```

#### 3.2.3 修复 PermanentDeleteFolder 漏删问题（问题 5）

**文件**: `mind-land-server/outline/service.go`

```go
func (s *Service) PermanentDeleteFolder(id uint) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        var docIDs []uint
        // 修复：移除 AND del = false 条件，删除文件夹下所有文档（无论 del 状态）
        tx.Model(&OutlineDocument{}).Where("folder_id = ?", id).Pluck("id", &docIDs)

        if len(docIDs) > 0 {
            if err := tx.Where("document_id IN ?", docIDs).Delete(&OutlineDocumentVersion{}).Error; err != nil {
                return err
            }
            if err := tx.Where("document_id IN ?", docIDs).Delete(&OutlineNode{}).Error; err != nil {
                return err
            }
            if err := tx.Where("id IN ?", docIDs).Delete(&OutlineDocument{}).Error; err != nil {
                return err
            }
        }

        return tx.Delete(&OutlineFolder{}, id).Error
    })
}
```

#### 3.2.4 优化 EmptyTrash（问题 6）

```go
func (s *Service) EmptyTrash() error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1. 收集所有 del=true 的文档 ID（包括已删除文件夹内的）
        var trashDocIDs []uint
        tx.Model(&OutlineDocument{}).Where("del = ?", true).Pluck("id", &trashDocIDs)

        // 2. 收集所有 del=true 的文件夹 ID，并追加其内文档
        var trashFolderIDs []uint
        tx.Model(&OutlineFolder{}).Where("del = ?", true).Pluck("id", &trashFolderIDs)
        if len(trashFolderIDs) > 0 {
            var folderDocIDs []uint
            // 注意：这里不限制 del 状态，确保文件夹内所有文档都被清理
            tx.Model(&OutlineDocument{}).Where("folder_id IN ?", trashFolderIDs).Pluck("id", &folderDocIDs)
            trashDocIDs = appendUnique(trashDocIDs, folderDocIDs)
        }

        // 3. 批量删除文档相关数据
        if len(trashDocIDs) > 0 {
            if err := tx.Where("document_id IN ?", trashDocIDs).Delete(&OutlineDocumentVersion{}).Error; err != nil {
                return err
            }
            if err := tx.Where("document_id IN ?", trashDocIDs).Delete(&OutlineNode{}).Error; err != nil {
                return err
            }
            if err := tx.Where("id IN ?", trashDocIDs).Delete(&OutlineDocument{}).Error; err != nil {
                return err
            }
        }

        // 4. 删除文件夹
        if len(trashFolderIDs) > 0 {
            if err := tx.Where("id IN ?", trashFolderIDs).Delete(&OutlineFolder{}).Error; err != nil {
                return err
            }
        }

        return nil
    })
}

func appendUnique(slice []uint, items []uint) []uint {
    seen := make(map[uint]bool)
    for _, v := range slice {
        seen[v] = true
    }
    for _, v := range items {
        if !seen[v] {
            slice = append(slice, v)
            seen[v] = true
        }
    }
    return slice
}
```

### 3.3 前端修复方案

#### 3.3.1 回收站视图显示文件夹（问题 1）

**文件**: `mind-land-web/src/pages/Note/FolderTreePanel.tsx`

点击「回收站」时，同时获取已删除的文件夹：

```typescript
onClick={() => {
  dispatch(closeDocument());
  dispatch(setCurrentView(item.view));
  dispatch(setCurrentFolderId(null));

  if (item.view === "trash") {
    // 同时获取已删除的文件夹和文档
    dispatch(fetchFoldersAction(true)); // 获取已删除文件夹
    dispatch(fetchDocumentsAction({
      page: 1, size: 50, trash: true,
    }));
  } else {
    dispatch(fetchFoldersAction()); // 获取正常文件夹
    dispatch(fetchDocumentsAction({
      page: 1, size: 50,
      favorite: item.view === "favorite" ? true : undefined,
      recent: item.view === "recent" ? true : undefined,
    }));
  }
}}
```

**同时修改** `ContentList.tsx` 使其在回收站视图中显示已删除的文件夹：

```typescript
// 回收站视图下显示已删除的文件夹
const subFolders = useMemo(() => {
  if (currentView === "trash") {
    return folders.filter((f) => f.del).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return folders
    .filter((f) => currentFolderId === null ? f.parentId === 0 : f.parentId === currentFolderId)
    .filter((f) => !f.del)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}, [folders, currentFolderId, currentView]);
```

#### 3.3.2 回收站右键菜单改造（问题 2）

**文件**: `mind-land-web/src/pages/Note/ContentList.tsx`

修改 `resolveContextMenuItems()` 以区分回收站视图：

```typescript
const resolveContextMenuItems = useCallback(() => {
  if (!contextTarget) return [];

  // ── 回收站视图：显示恢复 / 永久删除 ──
  if (currentView === "trash") {
    if (contextTarget.target.type === "folder") {
      const f = contextTarget.target.folder;
      return [
        {
          label: "恢复文件夹",
          onClick: async () => {
            await restoreFolder(f.id);
            dispatch(fetchFoldersAction());
            dispatch(fetchDocumentsAction({ trash: true }));
            dispatch(fetchAllDocumentsAction());
            toast.success("已恢复");
          },
        },
        {
          label: "永久删除",
          onClick: async () => {
            const confirmed = await showConfirm({
              title: "永久删除",
              description: `确定要永久删除文件夹"${f.name}"吗？此操作不可撤销。`,
              confirmText: "永久删除",
            });
            if (!confirmed) return;
            await permanentDeleteFolder(f.id);
            dispatch(fetchFoldersAction(true));
            dispatch(fetchDocumentsAction({ trash: true }));
            toast.success("已永久删除");
          },
          danger: true,
        },
      ];
    }

    const doc = documents.find((d) => d.id === (contextTarget.target as { type: "document"; docId: number }).docId);
    if (!doc) return [];
    return [
      {
        label: "恢复文档",
        onClick: async () => {
          await restoreDocument(doc.id);
          dispatch(fetchDocumentsAction({ trash: true }));
          dispatch(fetchAllDocumentsAction());
          toast.success("已恢复");
        },
      },
      {
        label: "永久删除",
        onClick: async () => {
          const confirmed = await showConfirm({
            title: "永久删除",
            description: `确定要永久删除"${doc.title || "未命名"}"吗？此操作不可撤销。`,
            confirmText: "永久删除",
          });
          if (!confirmed) return;
          await permanentDeleteDocument(doc.id);
          dispatch(fetchDocumentsAction({ trash: true }));
          toast.success("已永久删除");
        },
        danger: true,
      },
    ];
  }

  // ── 正常视图：原有菜单 ──
  if (contextTarget.target.type === "folder") {
    const f = contextTarget.target.folder;
    return [
      { label: "删除文件夹", onClick: () => handleDeleteFolder(f), danger: true },
    ];
  }
  const doc = documents.find((d) => d.id === (contextTarget.target as { type: "document"; docId: number }).docId);
  if (!doc) return [];
  return [
    { label: "打开", onClick: () => handleOpenDocument(doc) },
    { label: "重命名", onClick: () => handleRenameDocument(doc) },
    { label: "复制", onClick: () => handleDuplicateDocument(doc) },
    { label: doc.isFavorite ? "取消收藏" : "收藏", onClick: () => handleFavoriteDocument(doc) },
    { label: "删除", onClick: () => handleDeleteDocument(doc), danger: true },
  ];
}, [contextTarget, documents, currentView, /* ... other deps */]);
```

#### 3.3.3 添加清空回收站按钮（问题 2 扩展）

**文件**: `mind-land-web/src/pages/Note/ContentToolbar.tsx`

在回收站视图的工具栏中添加「清空回收站」按钮：

```typescript
export default function ContentToolbar({ currentFolderId, currentView, onCreateDocument, onCreateFolder }: ContentToolbarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();

  const handleEmptyTrash = useCallback(async () => {
    const confirmed = await showConfirm({
      title: "清空回收站",
      description: "确定要清空回收站中的所有内容吗？此操作不可撤销。",
      confirmText: "清空",
    });
    if (!confirmed) return;
    try {
      await emptyTrash();
      dispatch(fetchFoldersAction(true));
      dispatch(fetchDocumentsAction({ trash: true }));
      dispatch(fetchAllDocumentsAction());
      toast.success("回收站已清空");
    } catch {
      toast.error("清空失败");
    }
  }, [dispatch, toast]);

  const title = useMemo(() => {
    if (currentView === "trash") return "回收站";
    if (currentView === "favorite") return "收藏";
    if (currentView === "recent") return "最近";
    if (currentFolderId === null) return "我的文档";
    return folders.find((f) => f.id === currentFolderId)?.name || "我的文档";
  }, [currentView, currentFolderId, folders]);

  return (
    <div className="flex items-center justify-between px-6 pt-1 pb-3">
      <div className="max-w-[1000px] mx-auto w-full flex items-center justify-between">
        <h2 className="text-[34px] font-bold text-text-primary pl-8">{title}</h2>
        {currentView === "all" && (
          <div className="flex items-center gap-2">
            {/* 正常视图的按钮 */}
          </div>
        )}
        {currentView === "trash" && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-sm"
            onClick={handleEmptyTrash}
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空回收站
          </button>
        )}
      </div>
    </div>
  );
}
```

#### 3.3.4 修复回收站标题（问题 7）

已在上述 `ContentToolbar` 修改中一并解决，通过 `useMemo` 根据 `currentView` 动态计算标题。

---

## 四、实施计划

### Phase 1：后端修复（高优先级）

| 步骤 | 任务 | 文件 | 验证 |
|------|------|------|------|
| 1 | 修复 `DeleteFolder` 级联软删除 | `service.go` | 扩展 `trash_test.go` |
| 2 | 修复 `RestoreFolder` 级联恢复 | `service.go` | 新增测试用例 |
| 3 | 修复 `PermanentDeleteFolder` 漏删 | `service.go` | 新增测试用例 |
| 4 | 优化 `EmptyTrash` 逻辑 | `service.go` | 扩展现有测试 |

### Phase 2：前端改造（中优先级）

| 步骤 | 任务 | 文件 | 验证 |
|------|------|------|------|
| 5 | 回收站视图显示已删除文件夹 | `FolderTreePanel.tsx`, `ContentList.tsx` | 手动测试 |
| 6 | 回收站右键菜单（恢复/永久删除） | `ContentList.tsx` | 手动测试 |
| 7 | 清空回收站按钮 | `ContentToolbar.tsx` | 手动测试 |
| 8 | 修复回收站标题 | `ContentToolbar.tsx` | 手动测试 |

### Phase 3：Store 层适配（低优先级）

| 步骤 | 任务 | 文件 | 验证 |
|------|------|------|------|
| 9 | 添加回收站相关 action | `outlineStore.ts` | 单元测试 |
| 10 | 确保 `fetchAllDocumentsAction` 正确过滤 | `outlineStore.ts` | 手动测试 |

---

## 五、测试策略

### 5.1 后端测试扩展

在现有的 `trash_test.go` 基础上新增以下测试用例：

```go
// 测试 DeleteFolder 级联软删除
func TestDeleteFolder_CascadingSoftDelete(t *testing.T) { ... }

// 测试 RestoreFolder 级联恢复
func TestRestoreFolder_CascadingRestore(t *testing.T) { ... }

// 测试 PermanentDeleteFolder 处理已软删除子文档
func TestPermanentDeleteFolder_IncludesSoftDeletedDocs(t *testing.T) { ... }

// 测试 EmptyTrash 正确处理混合状态
func TestEmptyTrash_MixedStates(t *testing.T) { ... }
```

### 5.2 前端手动测试清单

- [ ] 删除文件夹后，回收站中能看到该文件夹及其内文档
- [ ] 在回收站中右键文档，显示「恢复文档」和「永久删除」
- [ ] 在回收站中右键文件夹，显示「恢复文件夹」和「永久删除」
- [ ] 恢复文档后，文档回到正常视图，节点也正常恢复
- [ ] 恢复文件夹后，文件夹及其内文档都回到正常视图
- [ ] 永久删除文档后，文档及其节点、版本从数据库消失
- [ ] 永久删除文件夹后，文件夹及其所有内容从数据库消失
- [ ] 点击「清空回收站」，所有已删除内容被清除
- [ ] 回收站标题正确显示为「回收站」
- [ ] 正常视图的文件夹删除后，其内文档在正常视图中不可见

---

## 六、风险与注意事项

### 6.1 数据迁移

当前数据库中可能已存在不一致数据（由于问题 3）：
- 文件夹已删除（`del=true`）但其内文档未删除（`del=false`）

**建议**：
- 后端修复后，可以添加一次性的数据修复逻辑（在启动时执行）
- 或在 `EmptyTrash` 中兼容处理这种情况

### 6.2 性能考虑

- 级联删除/恢复操作涉及多个表的批量更新，需要确保在事务中执行
- 对于大量文档的文件夹，操作可能较慢，前端需要显示加载状态
- `EmptyTrash` 可能需要处理大量数据，建议添加进度反馈

### 6.3 权限与安全

- 永久删除操作应有二次确认
- 清空回收站应有更强烈的警告提示
- 考虑添加操作日志（可选）

---

## 七、附录

### 7.1 相关文件清单

**后端**:
- `mind-land-server/outline/model.go` — 数据模型
- `mind-land-server/outline/service.go` — 业务逻辑（主要修改点）
- `mind-land-server/outline/handler.go` — HTTP 处理器
- `mind-land-server/outline/trash_test.go` — 回收站测试

**前端**:
- `mind-land-web/src/apis/outline.ts` — API 定义
- `mind-land-web/src/store/modules/outlineStore.ts` — Redux Store
- `mind-land-web/src/pages/Note/FolderTreePanel.tsx` — 左侧导航面板
- `mind-land-web/src/pages/Note/ContentList.tsx` — 内容列表（主要修改点）
- `mind-land-web/src/pages/Note/ContentToolbar.tsx` — 内容工具栏
- `mind-land-web/src/pages/Note/DocumentHome.tsx` — 文档首页容器

### 7.2 API 对照表

| 功能 | 后端 API | 前端 API 函数 | UI 调用状态 |
|------|----------|-------------|-----------|
| 获取回收站文件夹 | `GET /outline/folders?trash=true` | `getTrashFolders()` | ❌ 未调用 |
| 获取回收站文档 | `GET /outline/documents?trash=true` | `getTrashDocuments()` | ⚠️ 部分调用 |
| 恢复文档 | `PATCH /outline/documents/:id/restore` | `restoreDocument()` | ❌ 未调用 |
| 恢复文件夹 | `PATCH /outline/folders/:id/restore` | `restoreFolder()` | ❌ 未调用 |
| 永久删除文档 | `DELETE /outline/documents/:id/permanent` | `permanentDeleteDocument()` | ❌ 未调用 |
| 永久删除文件夹 | `DELETE /outline/folders/:id/permanent` | `permanentDeleteFolder()` | ❌ 未调用 |
| 清空回收站 | `DELETE /outline/trash` | `emptyTrash()` | ❌ 未调用 |