package outline

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupDocTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}
	if err := db.AutoMigrate(&OutlineFolder{}, &OutlineDocument{}, &OutlineNode{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestDocumentService(t *testing.T) {
	t.Run("CreateDocument", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		doc, err := svc.CreateDocument("测试文档", 0)
		if err != nil {
			t.Fatalf("CreateDocument failed: %v", err)
		}
		if doc.ID == 0 {
			t.Fatal("expected non-zero ID")
		}
		if doc.Title != "测试文档" {
			t.Fatalf("expected title '测试文档', got %q", doc.Title)
		}
		if doc.FolderID != 0 {
			t.Fatalf("expected folderId 0, got %d", doc.FolderID)
		}
		if doc.Del {
			t.Fatal("expected del=false")
		}
		var count int64
		db.Model(&OutlineNode{}).Where("document_id = ? AND del = ?", doc.ID, false).Count(&count)
		if count != 1 {
			t.Fatalf("expected 1 root node, got %d", count)
		}
	})

	t.Run("CreateDocumentDefaultTitle", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		doc, err := svc.CreateDocument("", 0)
		if err != nil {
			t.Fatalf("CreateDocument failed: %v", err)
		}
		if doc.Title != "未命名大纲" {
			t.Fatalf("expected title '未命名大纲', got %q", doc.Title)
		}
	})

	t.Run("GetDocuments_ByFolderId", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		folder, _ := svc.CreateFolder("Folder", 0)
		svc.CreateDocument("InFolder", folder.ID)
		svc.CreateDocument("AlsoInFolder", folder.ID)
		svc.CreateDocument("RootDoc", 0)

		docs, total, err := svc.GetDocuments(folder.ID, false, false, false, 1, 20)
		if err != nil {
			t.Fatalf("GetDocuments failed: %v", err)
		}
		if total != 2 {
			t.Fatalf("expected total 2, got %d", total)
		}
		if len(docs) != 2 {
			t.Fatalf("expected 2 docs, got %d", len(docs))
		}
		for _, d := range docs {
			if d.FolderID != folder.ID {
				t.Fatalf("expected folderId %d, got %d", folder.ID, d.FolderID)
			}
		}
	})

	t.Run("GetDocuments_ByFavorite", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		svc.CreateDocument("Normal1", 0)
		doc2, _ := svc.CreateDocument("Fav1", 0)
		doc3, _ := svc.CreateDocument("Fav2", 0)
		svc.UpdateDocument(doc2.ID, map[string]interface{}{"IsFavorite": true})
		svc.UpdateDocument(doc3.ID, map[string]interface{}{"IsFavorite": true})

		docs, total, err := svc.GetDocuments(0, true, false, false, 1, 20)
		if err != nil {
			t.Fatalf("GetDocuments failed: %v", err)
		}
		if total != 2 {
			t.Fatalf("expected total 2, got %d", total)
		}
		if len(docs) != 2 {
			t.Fatalf("expected 2 docs, got %d", len(docs))
		}
		for _, d := range docs {
			if !d.IsFavorite {
				t.Fatalf("expected IsFavorite=true for doc %d", d.ID)
			}
		}
	})

	t.Run("GetDocuments_SortedByRecent", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		svc.CreateDocument("First", 0)
		time.Sleep(100 * time.Millisecond)
		svc.CreateDocument("Second", 0)
		time.Sleep(100 * time.Millisecond)
		svc.CreateDocument("Third", 0)

		docs, total, err := svc.GetDocuments(0, false, true, false, 1, 20)
		if err != nil {
			t.Fatalf("GetDocuments failed: %v", err)
		}
		if total != 3 {
			t.Fatalf("expected total 3, got %d", total)
		}
		if len(docs) != 3 {
			t.Fatalf("expected 3 docs, got %d", len(docs))
		}
		if docs[0].Title != "Third" {
			t.Fatalf("expected 'Third' first (recent), got %q", docs[0].Title)
		}
		if docs[1].Title != "Second" {
			t.Fatalf("expected 'Second' second, got %q", docs[1].Title)
		}
		if docs[2].Title != "First" {
			t.Fatalf("expected 'First' third, got %q", docs[2].Title)
		}
	})

	t.Run("GetDocuments_Pagination", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		for i := 0; i < 25; i++ {
			svc.CreateDocument("Doc", 0)
		}

		docs, total, err := svc.GetDocuments(0, false, false, false, 1, 10)
		if err != nil {
			t.Fatalf("GetDocuments page 1 failed: %v", err)
		}
		if total != 25 {
			t.Fatalf("expected total 25, got %d", total)
		}
		if len(docs) != 10 {
			t.Fatalf("expected 10 docs on page 1, got %d", len(docs))
		}

		docs3, total3, err := svc.GetDocuments(0, false, false, false, 3, 10)
		if err != nil {
			t.Fatalf("GetDocuments page 3 failed: %v", err)
		}
		if total3 != 25 {
			t.Fatalf("expected total 25, got %d", total3)
		}
		if len(docs3) != 5 {
			t.Fatalf("expected 5 docs on page 3, got %d", len(docs3))
		}
	})

	t.Run("GetDocument_WithNodes", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("HasNodes", 0)
		db.Create(&OutlineNode{DocumentID: doc.ID, Content: "Node1", SortOrder: 1})
		db.Create(&OutlineNode{DocumentID: doc.ID, Content: "Node2", SortOrder: 2})

		result, nodes, err := svc.GetDocument(doc.ID, true)
		if err != nil {
			t.Fatalf("GetDocument failed: %v", err)
		}
		if result.ID != doc.ID {
			t.Fatalf("expected doc ID %d, got %d", doc.ID, result.ID)
		}
		if len(nodes) != 3 {
			t.Fatalf("expected 3 nodes (root+2), got %d", len(nodes))
		}
	})

	t.Run("GetDocument_WithoutNodes", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("NoNodes", 0)
		result, nodes, err := svc.GetDocument(doc.ID, false)
		if err != nil {
			t.Fatalf("GetDocument failed: %v", err)
		}
		if result.ID != doc.ID {
			t.Fatalf("expected doc ID %d, got %d", doc.ID, result.ID)
		}
		if nodes != nil {
			t.Fatal("expected nil nodes when withNodes=false")
		}
	})

	t.Run("GetDocument_NonExistent", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		_, _, err := svc.GetDocument(99999, false)
		if err == nil {
			t.Fatal("expected error for non-existent document")
		}
	})

	t.Run("UpdateDocumentTitle", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("Original", 0)
		updated, err := svc.UpdateDocument(doc.ID, map[string]interface{}{"Title": "NewTitle"})
		if err != nil {
			t.Fatalf("UpdateDocument failed: %v", err)
		}
		if updated.Title != "NewTitle" {
			t.Fatalf("expected title 'NewTitle', got %q", updated.Title)
		}
	})

	t.Run("UpdateDocumentFavorite", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("Test", 0)
		updated, err := svc.UpdateDocument(doc.ID, map[string]interface{}{"IsFavorite": true})
		if err != nil {
			t.Fatalf("UpdateDocument failed: %v", err)
		}
		if !updated.IsFavorite {
			t.Fatal("expected IsFavorite=true")
		}
	})

	t.Run("UpdateDocument_NonExistent", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		_, err := svc.UpdateDocument(99999, map[string]interface{}{"Title": "Nope"})
		if err == nil {
			t.Fatal("expected error for non-existent document")
		}
	})

	t.Run("MoveDocument", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		folder1, _ := svc.CreateFolder("Folder1", 0)
		folder2, _ := svc.CreateFolder("Folder2", 0)
		doc, _ := svc.CreateDocument("Movable", folder1.ID)

		err := svc.MoveDocument(doc.ID, folder2.ID)
		if err != nil {
			t.Fatalf("MoveDocument failed: %v", err)
		}

		result, _, _ := svc.GetDocument(doc.ID, false)
		if result.FolderID != folder2.ID {
			t.Fatalf("expected folderId %d, got %d", folder2.ID, result.FolderID)
		}
	})

	t.Run("MoveDocument_NonExistent", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		err := svc.MoveDocument(99999, 1)
		if err == nil {
			t.Fatal("expected error for non-existent document")
		}
	})

	t.Run("DeleteDocument_SoftDelete", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("ToDelete", 0)
		db.Create(&OutlineNode{DocumentID: doc.ID, Content: "Child1", SortOrder: 1})

		err := svc.DeleteDocument(doc.ID)
		if err != nil {
			t.Fatalf("DeleteDocument failed: %v", err)
		}

		var docCheck OutlineDocument
		db.First(&docCheck, doc.ID)
		if !docCheck.Del {
			t.Fatal("expected document Del=true")
		}

		var nodeCount int64
		db.Model(&OutlineNode{}).Where("document_id = ? AND del = ?", doc.ID, true).Count(&nodeCount)
		if nodeCount != 2 {
			t.Fatalf("expected 2 deleted nodes, got %d", nodeCount)
		}

		var activeNodes int64
		db.Model(&OutlineNode{}).Where("document_id = ? AND del = ?", doc.ID, false).Count(&activeNodes)
		if activeNodes != 0 {
			t.Fatalf("expected 0 active nodes, got %d", activeNodes)
		}
	})

	t.Run("DuplicateDocument_DeepCopy", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("Original", 0)
		db.Create(&OutlineNode{DocumentID: doc.ID, Content: "ChildA", SortOrder: 1})
		db.Create(&OutlineNode{DocumentID: doc.ID, Content: "ChildB", SortOrder: 2})

		dup, err := svc.DuplicateDocument(doc.ID)
		if err != nil {
			t.Fatalf("DuplicateDocument failed: %v", err)
		}
		if dup.ID == doc.ID {
			t.Fatal("expected duplicate to have different ID")
		}
		if dup.Title != "Original (副本)" {
			t.Fatalf("expected title 'Original (副本)', got %q", dup.Title)
		}
		if dup.FolderID != doc.FolderID {
			t.Fatalf("expected folderId %d, got %d", doc.FolderID, dup.FolderID)
		}
		if dup.IsFavorite {
			t.Fatal("expected duplicate IsFavorite=false")
		}

		var nodeCount int64
		db.Model(&OutlineNode{}).Where("document_id = ? AND del = ?", dup.ID, false).Count(&nodeCount)
		if nodeCount != 3 {
			t.Fatalf("expected 3 nodes in duplicate, got %d", nodeCount)
		}
	})

	t.Run("DuplicateDocument_NonExistent", func(t *testing.T) {
		db := setupDocTestDB(t)
		svc := NewService(db)

		_, err := svc.DuplicateDocument(99999)
		if err == nil {
			t.Fatal("expected error for non-existent document")
		}
	})
}
