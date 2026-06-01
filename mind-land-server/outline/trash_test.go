package outline

import (
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupTrashTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}
	if err := db.AutoMigrate(&OutlineFolder{}, &OutlineDocument{}, &OutlineNode{}, &OutlineDocumentVersion{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestTrashService(t *testing.T) {
	t.Run("GetTrashFolders_AfterSoftDelete", func(t *testing.T) {
		db := setupTrashTestDB(t)
		svc := NewService(db)

		folder, _ := svc.CreateFolder("TrashMe", 0)
		svc.DeleteFolder(folder.ID)

		folders, err := svc.GetTrashFolders()
		if err != nil {
			t.Fatalf("GetTrashFolders failed: %v", err)
		}
		if len(folders) != 1 {
			t.Fatalf("expected 1 trash folder, got %d", len(folders))
		}
		if folders[0].ID != folder.ID {
			t.Fatalf("expected folder ID %d, got %d", folder.ID, folders[0].ID)
		}
		if !folders[0].Del {
			t.Fatal("expected del=true for trash folder")
		}
	})

	t.Run("GetTrashDocuments_AfterSoftDelete", func(t *testing.T) {
		db := setupTrashTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("TrashDoc", 0)
		svc.DeleteDocument(doc.ID)

		docs, err := svc.GetTrashDocuments()
		if err != nil {
			t.Fatalf("GetTrashDocuments failed: %v", err)
		}
		if len(docs) != 1 {
			t.Fatalf("expected 1 trash document, got %d", len(docs))
		}
		if docs[0].ID != doc.ID {
			t.Fatalf("expected document ID %d, got %d", doc.ID, docs[0].ID)
		}
		if !docs[0].Del {
			t.Fatal("expected del=true for trash document")
		}
	})

	t.Run("RestoreDocument_SetsDelFalse", func(t *testing.T) {
		db := setupTrashTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("RestoreMe", 0)
		svc.DeleteDocument(doc.ID)

		err := svc.RestoreDocument(doc.ID)
		if err != nil {
			t.Fatalf("RestoreDocument failed: %v", err)
		}

		var restored OutlineDocument
		db.First(&restored, doc.ID)
		if restored.Del {
			t.Fatal("expected del=false after restore")
		}

		normalDocs, _, _ := svc.GetDocuments(0, false, false, false, 1, 20)
		found := false
		for _, d := range normalDocs {
			if d.ID == doc.ID {
				found = true
				break
			}
		}
		if !found {
			t.Fatal("expected restored document in normal query results")
		}
	})

	t.Run("RestoreFolder_SetsDelFalse", func(t *testing.T) {
		db := setupTrashTestDB(t)
		svc := NewService(db)

		folder, _ := svc.CreateFolder("RestoreMe", 0)
		svc.DeleteFolder(folder.ID)

		err := svc.RestoreFolder(folder.ID)
		if err != nil {
			t.Fatalf("RestoreFolder failed: %v", err)
		}

		var restored OutlineFolder
		db.First(&restored, folder.ID)
		if restored.Del {
			t.Fatal("expected del=false after restore")
		}

		normalFolders, _ := svc.GetFolders(false)
		found := false
		for _, f := range normalFolders {
			if f.ID == folder.ID {
				found = true
				break
			}
		}
		if !found {
			t.Fatal("expected restored folder in normal query results")
		}
	})

	t.Run("PermanentDeleteDocument_RemovesDocAndNodesAndVersions", func(t *testing.T) {
		db := setupTrashTestDB(t)
		svc := NewService(db)

		doc, _ := svc.CreateDocument("PermanentDelete", 0)
		db.Create(&OutlineNode{DocumentID: doc.ID, Content: "Extra", SortOrder: 1})
		db.Create(&OutlineDocumentVersion{DocumentID: doc.ID, Snapshot: "v1", NodeCount: 2})

		err := svc.PermanentDeleteDocument(doc.ID)
		if err != nil {
			t.Fatalf("PermanentDeleteDocument failed: %v", err)
		}

		var docCount int64
		db.Model(&OutlineDocument{}).Where("id = ?", doc.ID).Count(&docCount)
		if docCount != 0 {
			t.Fatal("expected document to be permanently deleted")
		}

		var nodeCount int64
		db.Model(&OutlineNode{}).Where("document_id = ?", doc.ID).Count(&nodeCount)
		if nodeCount != 0 {
			t.Fatal("expected nodes to be permanently deleted")
		}

		var versionCount int64
		db.Model(&OutlineDocumentVersion{}).Where("document_id = ?", doc.ID).Count(&versionCount)
		if versionCount != 0 {
			t.Fatal("expected versions to be permanently deleted")
		}
	})

	t.Run("PermanentDeleteFolder_RemovesFolderAndChildDocsAndNodes", func(t *testing.T) {
		db := setupTrashTestDB(t)
		svc := NewService(db)

		folder, _ := svc.CreateFolder("Folder", 0)
		doc1, _ := svc.CreateDocument("Doc1", folder.ID)
		db.Create(&OutlineNode{DocumentID: doc1.ID, Content: "N1", SortOrder: 1})
		doc2, _ := svc.CreateDocument("Doc2", folder.ID)

		err := svc.PermanentDeleteFolder(folder.ID)
		if err != nil {
			t.Fatalf("PermanentDeleteFolder failed: %v", err)
		}

		var folderCount int64
		db.Model(&OutlineFolder{}).Where("id = ?", folder.ID).Count(&folderCount)
		if folderCount != 0 {
			t.Fatal("expected folder to be permanently deleted")
		}

		var docCount int64
		db.Model(&OutlineDocument{}).Where("id IN ?", []uint{doc1.ID, doc2.ID}).Count(&docCount)
		if docCount != 0 {
			t.Fatal("expected child documents to be permanently deleted")
		}

		var nodeCount int64
		db.Model(&OutlineNode{}).Where("document_id IN ?", []uint{doc1.ID, doc2.ID}).Count(&nodeCount)
		if nodeCount != 0 {
			t.Fatal("expected child document nodes to be permanently deleted")
		}
	})

	t.Run("EmptyTrash_ClearsAllSoftDeleted", func(t *testing.T) {
		db := setupTrashTestDB(t)
		svc := NewService(db)

		folder, _ := svc.CreateFolder("TrashFolder", 0)
		doc, _ := svc.CreateDocument("TrashDoc", folder.ID)
		svc.DeleteFolder(folder.ID)
		svc.DeleteDocument(doc.ID)

		keepDoc, _ := svc.CreateDocument("Keep", 0)

		err := svc.EmptyTrash()
		if err != nil {
			t.Fatalf("EmptyTrash failed: %v", err)
		}

		trashFolders, _ := svc.GetTrashFolders()
		if len(trashFolders) != 0 {
			t.Fatalf("expected 0 trash folders, got %d", len(trashFolders))
		}
		trashDocs, _ := svc.GetTrashDocuments()
		if len(trashDocs) != 0 {
			t.Fatalf("expected 0 trash documents, got %d", len(trashDocs))
		}

		var keepCheck OutlineDocument
		db.First(&keepCheck, keepDoc.ID)
		if keepCheck.ID == 0 {
			t.Fatal("expected non-deleted document to survive EmptyTrash")
		}
	})

	t.Run("RestoreDocument_WhenFolderHardDeleted_RestoresToRoot", func(t *testing.T) {
		db := setupTrashTestDB(t)
		svc := NewService(db)

		folder, _ := svc.CreateFolder("Folder", 0)
		doc, _ := svc.CreateDocument("DocInFolder", folder.ID)
		svc.DeleteDocument(doc.ID)
		svc.PermanentDeleteFolder(folder.ID)

		err := svc.RestoreDocument(doc.ID)
		if err != nil {
			t.Fatalf("RestoreDocument failed: %v", err)
		}

		var restored OutlineDocument
		db.First(&restored, doc.ID)
		if restored.Del {
			t.Fatal("expected del=false after restore")
		}
		if restored.FolderID != 0 {
			t.Fatalf("expected FolderID=0 when original folder is gone, got %d", restored.FolderID)
		}
	})
}
