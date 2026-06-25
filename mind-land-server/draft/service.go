package draft

import (
	"errors"
	"strings"
	"time"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/text"
	"gorm.io/gorm"
)

// ErrVersionConflict 乐观锁冲突
var ErrVersionConflict = errors.New("version_conflict")

// ErrNotFound 草稿不存在（含已软删的）
var ErrNotFound = errors.New("draft not found")

// ErrConflictNotDeleted 试图彻底删除一个未软删的草稿
var ErrConflictNotDeleted = errors.New("draft not in trash")

// Service 草稿服务
type Service struct {
	db *gorm.DB
	md goldmark.Markdown
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db, md: goldmark.New()}
}

// ---- 请求/响应类型 ----

type CreateReq struct {
	ContentMD string `json:"contentMd"`
}

type UpdateReq struct {
	ContentMD  string `json:"contentMd"`
	BaseVersion int   `json:"baseVersion"`
}

type ConflictResp struct {
	Error           string `json:"error"`
	CurrentVersion  int    `json:"currentVersion"`
	ServerContentMD string `json:"serverContentMd"`
}

// ListItem 列表项（不含 content_md 全文）
type ListItem struct {
	ID         uint      `json:"id"`
	Title      string    `json:"title"`
	Preview    string    `json:"preview"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// ---- 查询 ----

// List 返回未软删的草稿列表（不含全文），按 updated_at 倒序
func (s *Service) List() ([]ListItem, error) {
	var drafts []Draft
	if err := s.db.Where("deleted_at IS NULL").
		Order("updated_at DESC").
		Find(&drafts).Error; err != nil {
		return nil, err
	}
	items := make([]ListItem, len(drafts))
	for i, d := range drafts {
		items[i] = ListItem{
			ID:        d.ID,
			Title:     d.Title,
			Preview:   derivePreview(s.md, d.ContentMD),
			UpdatedAt: d.UpdatedAt,
		}
	}
	return items, nil
}

// Get 返回单篇草稿全文；未找到或已软删返回 ErrNotFound
func (s *Service) Get(id uint) (*Draft, error) {
	var d Draft
	if err := s.db.Where("id = ? AND deleted_at IS NULL", id).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &d, nil
}

// ---- 创建 ----

func (s *Service) Create(req CreateReq) (*Draft, error) {
	now := time.Now()
	d := Draft{
		ContentMD: req.ContentMD,
		Title:     deriveTitle(s.md, req.ContentMD),
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.db.Create(&d).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

// ---- 更新（乐观锁） ----

// Update 整篇替换 + version 乐观锁
// 成功返回更新后的草稿（含新 version）
// 若 base_version 与服务端不一致，返回 ErrVersionConflict + ConflictResp
func (s *Service) Update(id uint, req UpdateReq) (*Draft, *ConflictResp, error) {
	var d Draft
	if err := s.db.Where("id = ? AND deleted_at IS NULL", id).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, err
	}

	if d.Version != req.BaseVersion {
		return nil, &ConflictResp{
			Error:           "version_conflict",
			CurrentVersion:  d.Version,
			ServerContentMD: d.ContentMD,
		}, ErrVersionConflict
	}

	now := time.Now()
	updates := map[string]interface{}{
		"content_md": req.ContentMD,
		"title":      deriveTitle(s.md, req.ContentMD),
		"version":    d.Version + 1,
		"updated_at": now,
	}
	if err := s.db.Model(&Draft{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, nil, err
	}

	d.ContentMD = req.ContentMD
	d.Title = updates["title"].(string)
	d.Version = d.Version + 1
	d.UpdatedAt = now
	return &d, nil, nil
}

// ---- 软删 / 恢复 / 彻底删 / 清空回收站 ----

func (s *Service) SoftDelete(id uint) error {
	now := time.Now()
	res := s.db.Model(&Draft{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Update("deleted_at", now)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Service) Restore(id uint) error {
	res := s.db.Model(&Draft{}).
		Where("id = ? AND deleted_at IS NOT NULL", id).
		Update("deleted_at", nil)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

// PermanentDelete 物理删除；要求草稿必须先被软删
func (s *Service) PermanentDelete(id uint) error {
	res := s.db.Where("id = ? AND deleted_at IS NOT NULL", id).Delete(&Draft{}, id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		// 区分：是不存在，还是存在但未软删
		var count int64
		s.db.Model(&Draft{}).Where("id = ?", id).Count(&count)
		if count == 0 {
			return ErrNotFound
		}
		return ErrConflictNotDeleted
	}
	return nil
}

func (s *Service) EmptyTrash() error {
	return s.db.Where("deleted_at IS NOT NULL").Delete(&Draft{}).Error
}

// ---- title / preview 派生 ----

// deriveTitle 取第一个 H1 的文本；无 H1 取首行非空纯文本；再 fallback 空串
// 剥离内联 MD 语法（**、`、[]() 等）
func deriveTitle(md goldmark.Markdown, content string) string {
	reader := text.NewReader([]byte(content))
	doc := md.Parser().Parse(reader)

	return astTitleOrFirstLine(doc, reader)
}

// derivePreview 跳过 H1，取第一个段落（或列表/引用等块）的纯文本，截 120 字 + 省略号
func derivePreview(md goldmark.Markdown, content string) string {
	reader := text.NewReader([]byte(content))
	doc := md.Parser().Parse(reader)

	return astFirstNonHeadingText(doc, reader)
}

// 遍历 AST，找第一个 H1 → 取其文本；否则找第一个非空文本段
func astTitleOrFirstLine(doc ast.Node, reader text.Reader) string {
	var h1Text string
	var firstLineText string

	ast.Walk(doc, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		if n.Kind() == ast.KindHeading {
			h := n.(*ast.Heading)
			if h.Level == 1 && h1Text == "" {
				h1Text = collectText(n, reader)
				return ast.WalkStop, nil
			}
			// 跳过非 H1 的标题节点内部遍历
			return ast.WalkSkipChildren, nil
		}
		// 段落、列表项、引用等任何块的首个文本
		if n.Kind() == ast.KindParagraph && firstLineText == "" {
			firstLineText = collectText(n, reader)
			return ast.WalkSkipChildren, nil
		}
		return ast.WalkContinue, nil
	})

	if h1Text != "" {
		return truncate(strings.TrimSpace(h1Text), 200)
	}
	if firstLineText != "" {
		return truncate(strings.TrimSpace(firstLineText), 200)
	}
	return ""
}

// 遍历 AST，找第一个非 H1 的块的纯文本
func astFirstNonHeadingText(doc ast.Node, reader text.Reader) string {
	var result string

	ast.Walk(doc, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		if n.Kind() == ast.KindHeading {
			return ast.WalkSkipChildren, nil
		}
		if n.Kind() == ast.KindParagraph {
			result = collectText(n, reader)
			return ast.WalkStop, nil
		}
		return ast.WalkContinue, nil
	})

	result = strings.TrimSpace(result)
	if result == "" {
		return ""
	}
	return truncate(result, 120)
}

// collectText 收集节点内所有文本（拼接子文本节点），软/硬换行处插入空格
func collectText(n ast.Node, reader text.Reader) string {
	source := reader.Source()
	var b strings.Builder
	ast.Walk(n, func(child ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		if t, ok := child.(*ast.Text); ok {
			b.Write(t.Text(source))
			if t.SoftLineBreak() || t.HardLineBreak() {
				b.WriteByte(' ')
			}
		}
		return ast.WalkContinue, nil
	})
	return b.String()
}

func truncate(s string, max int) string {
	// 按 rune 计数
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max]) + "…"
}
