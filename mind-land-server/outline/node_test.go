package outline

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupNodeTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}
	if err := db.AutoMigrate(&OutlineFolder{}, &OutlineDocument{}, &OutlineNode{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestNodeService(t *testing.T) {
	t.Run("SaveNodes_CreateNew", func(t *testing.T) {
		db := setupNodeTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("Doc", 0)
		nodes := []OutlineNode{
			{Content: "Node A", SortOrder: 0},
			{Content: "Node B", SortOrder: 1},
		}

		err := svc.SaveNodes(doc.ID, nodes)
		if err != nil {
			t.Fatalf("SaveNodes failed: %v", err)
		}

		var saved []OutlineNode
		db.Where("document_id = ? AND del = ?", doc.ID, false).
			Order("sort_order ASC, id ASC").Find(&saved)
		if len(saved) != 2 {
			t.Fatalf("expected 2 nodes, got %d", len(saved))
		}
		if saved[0].ID == 0 {
			t.Fatal("expected non-zero ID for new node")
		}
		if saved[1].ID == 0 {
			t.Fatal("expected non-zero ID for new node")
		}
		if saved[0].DocumentID != doc.ID {
			t.Fatalf("expected document_id %d, got %d", doc.ID, saved[0].DocumentID)
		}
		if saved[0].Content != "Node A" {
			t.Fatalf("expected 'Node A', got %q", saved[0].Content)
		}
		if saved[1].Content != "Node B" {
			t.Fatalf("expected 'Node B', got %q", saved[1].Content)
		}
	})

	t.Run("SaveNodes_UpdateExisting", func(t *testing.T) {
		db := setupNodeTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("Doc", 0)
		svc.SaveNodes(doc.ID, []OutlineNode{
			{Content: "Original", SortOrder: 0},
		})

		var saved []OutlineNode
		db.Where("document_id = ? AND del = ?", doc.ID, false).Find(&saved)
		originalID := saved[0].ID

		updated := []OutlineNode{
			{ID: originalID, Content: "Updated", SortOrder: 99},
		}
		err := svc.SaveNodes(doc.ID, updated)
		if err != nil {
			t.Fatalf("SaveNodes update failed: %v", err)
		}

		db.Where("document_id = ? AND del = ?", doc.ID, false).Find(&saved)
		if len(saved) != 1 {
			t.Fatalf("expected 1 node, got %d", len(saved))
		}
		if saved[0].ID != originalID {
			t.Fatal("expected ID to be preserved on update")
		}
		if saved[0].Content != "Updated" {
			t.Fatalf("expected content 'Updated', got %q", saved[0].Content)
		}
		if saved[0].SortOrder != 99 {
			t.Fatalf("expected sortOrder 99, got %d", saved[0].SortOrder)
		}
	})

	t.Run("SaveNodes_MixedCreateAndUpdate", func(t *testing.T) {
		db := setupNodeTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("Doc", 0)
		svc.SaveNodes(doc.ID, []OutlineNode{
			{Content: "Existing", SortOrder: 0},
		})

		var saved []OutlineNode
		db.Where("document_id = ? AND del = ?", doc.ID, false).Find(&saved)
		oldID := saved[0].ID

		mixed := []OutlineNode{
			{ID: oldID, Content: "Updated Existing", SortOrder: 0},
			{Content: "New Node", SortOrder: 1},
		}
		err := svc.SaveNodes(doc.ID, mixed)
		if err != nil {
			t.Fatalf("SaveNodes mixed failed: %v", err)
		}

		db.Where("document_id = ? AND del = ?", doc.ID, false).
			Order("sort_order ASC, id ASC").Find(&saved)
		if len(saved) != 2 {
			t.Fatalf("expected 2 nodes, got %d", len(saved))
		}
		if saved[0].ID != oldID {
			t.Fatal("expected existing node to keep its ID")
		}
		if saved[0].Content != "Updated Existing" {
			t.Fatalf("expected 'Updated Existing', got %q", saved[0].Content)
		}
		if saved[1].ID == 0 {
			t.Fatal("expected new node to get an ID")
		}
		if saved[1].Content != "New Node" {
			t.Fatalf("expected 'New Node', got %q", saved[1].Content)
		}
	})

	t.Run("SaveNodes_EmptyArray", func(t *testing.T) {
		db := setupNodeTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("Doc", 0)
		svc.SaveNodes(doc.ID, []OutlineNode{
			{Content: "ToDelete", SortOrder: 0},
			{Content: "AlsoDelete", SortOrder: 1},
		})

		err := svc.SaveNodes(doc.ID, []OutlineNode{})
		if err != nil {
			t.Fatalf("SaveNodes empty failed: %v", err)
		}

		var count int64
		db.Model(&OutlineNode{}).Where("document_id = ? AND del = ?", doc.ID, false).Count(&count)
		if count != 0 {
			t.Fatalf("expected 0 nodes after empty save, got %d", count)
		}
	})

	t.Run("SaveNodes_RemovesOldNodes", func(t *testing.T) {
		db := setupNodeTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("Doc", 0)
		svc.SaveNodes(doc.ID, []OutlineNode{
			{Content: "A", SortOrder: 0},
			{Content: "B", SortOrder: 1},
			{Content: "C", SortOrder: 2},
		})

		var saved []OutlineNode
		db.Where("document_id = ? AND del = ?", doc.ID, false).Find(&saved)
		keepID := saved[0].ID

		replacement := []OutlineNode{
			{ID: keepID, Content: "A updated", SortOrder: 0},
			{Content: "D", SortOrder: 1},
		}
		err := svc.SaveNodes(doc.ID, replacement)
		if err != nil {
			t.Fatalf("SaveNodes failed: %v", err)
		}

		db.Where("document_id = ? AND del = ?", doc.ID, false).
			Order("sort_order ASC, id ASC").Find(&saved)
		if len(saved) != 2 {
			t.Fatalf("expected 2 nodes, got %d", len(saved))
		}
		for _, n := range saved {
			if n.Content == "B" || n.Content == "C" {
				t.Fatalf("old node %q should have been removed", n.Content)
			}
		}
	})

	t.Run("SaveNodes_TransactionalRollback", func(t *testing.T) {
		db := setupNodeTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("Doc", 0)
		svc.SaveNodes(doc.ID, []OutlineNode{
			{Content: "A", SortOrder: 0},
			{Content: "B", SortOrder: 1},
			{Content: "C", SortOrder: 2},
		})

		var before []OutlineNode
		db.Where("document_id = ? AND del = ?", doc.ID, false).
			Order("sort_order ASC, id ASC").Find(&before)
		if len(before) != 3 {
			t.Fatalf("expected 3 initial nodes, got %d", len(before))
		}

		badNodes := []OutlineNode{
			{Content: "New", SortOrder: 0},
			{ID: 99999, Content: "Bad", SortOrder: 1},
		}
		err := svc.SaveNodes(doc.ID, badNodes)
		if err == nil {
			t.Fatal("expected error for non-existent node ID")
		}

		var after []OutlineNode
		db.Where("document_id = ? AND del = ?", doc.ID, false).
			Order("sort_order ASC, id ASC").Find(&after)
		if len(after) != len(before) {
			t.Fatalf("expected %d nodes after rollback, got %d", len(before), len(after))
		}
		for i := range before {
			if after[i].ID != before[i].ID || after[i].Content != before[i].Content {
				t.Fatalf("node at index %d changed after rollback", i)
			}
		}
	})

	t.Run("ReorderNodes_OnlyUpdatesSortAndParent", func(t *testing.T) {
		db := setupNodeTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("Doc", 0)
		svc.SaveNodes(doc.ID, []OutlineNode{
			{Content: "First", SortOrder: 0},
			{Content: "Second", SortOrder: 1},
		})

		var saved []OutlineNode
		db.Where("document_id = ? AND del = ?", doc.ID, false).
			Order("sort_order ASC").Find(&saved)

		orders := []NodeOrder{
			{ID: saved[0].ID, SortOrder: 1, ParentID: 0},
			{ID: saved[1].ID, SortOrder: 0, ParentID: saved[0].ID},
		}
		err := svc.ReorderNodes(doc.ID, orders)
		if err != nil {
			t.Fatalf("ReorderNodes failed: %v", err)
		}

		var reordered []OutlineNode
		db.Where("document_id = ? AND del = ?", doc.ID, false).
			Order("sort_order ASC").Find(&reordered)

		if len(reordered) != 2 {
			t.Fatalf("expected 2 nodes, got %d", len(reordered))
		}
		if reordered[0].ID != saved[1].ID {
			t.Fatal("expected nodes to be reordered by sort_order")
		}
		if reordered[0].Content != "Second" {
			t.Fatalf("expected content 'Second' unchanged, got %q", reordered[0].Content)
		}
		if reordered[1].Content != "First" {
			t.Fatalf("expected content 'First' unchanged, got %q", reordered[1].Content)
		}
		if reordered[0].ParentID != saved[0].ID {
			t.Fatalf("expected parentId %d, got %d", saved[0].ID, reordered[0].ParentID)
		}
	})

	t.Run("SaveNodes_Bulk500", func(t *testing.T) {
		db := setupNodeTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("Bulk", 0)
		nodes := make([]OutlineNode, 500)
		for i := 0; i < 500; i++ {
			nodes[i] = OutlineNode{
				Content:   "Node",
				SortOrder: i,
			}
		}

		start := time.Now()
		err := svc.SaveNodes(doc.ID, nodes)
		duration := time.Since(start)
		if err != nil {
			t.Fatalf("SaveNodes bulk failed: %v", err)
		}
		if duration >= time.Second {
			t.Fatalf("SaveNodes took %v, expected < 1s", duration)
		}

		var count int64
		db.Model(&OutlineNode{}).Where("document_id = ? AND del = ?", doc.ID, false).Count(&count)
		if count != 500 {
			t.Fatalf("expected 500 nodes, got %d", count)
		}
	})
}
