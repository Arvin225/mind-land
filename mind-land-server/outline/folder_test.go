package outline

import (
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}
	if err := db.AutoMigrate(&OutlineFolder{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestFolderService(t *testing.T) {
	db := setupTestDB(t)
	svc := NewService(db)

	t.Run("CreateRootFolder", func(t *testing.T) {
		folder, err := svc.CreateFolder("Root", 0)
		if err != nil {
			t.Fatalf("CreateFolder failed: %v", err)
		}
		if folder.ID == 0 {
			t.Fatal("expected non-zero ID")
		}
		if folder.Name != "Root" {
			t.Fatalf("expected name 'Root', got %q", folder.Name)
		}
		if folder.ParentID != 0 {
			t.Fatalf("expected parentId 0, got %d", folder.ParentID)
		}
		if folder.Del {
			t.Fatal("expected del=false")
		}
	})

	t.Run("CreateChildFolder", func(t *testing.T) {
		parent, err := svc.CreateFolder("Parent", 0)
		if err != nil {
			t.Fatalf("CreateFolder parent failed: %v", err)
		}
		child, err := svc.CreateFolder("Child", parent.ID)
		if err != nil {
			t.Fatalf("CreateFolder child failed: %v", err)
		}
		if child.ParentID != parent.ID {
			t.Fatalf("expected parentId %d, got %d", parent.ID, child.ParentID)
		}
	})

	t.Run("GetFolders_ReturnsSorted", func(t *testing.T) {
		svc.CreateFolder("B", 0)
		svc.CreateFolder("A", 0)
		folders, err := svc.GetFolders(false)
		if err != nil {
			t.Fatalf("GetFolders failed: %v", err)
		}
		if len(folders) < 2 {
			t.Fatal("expected at least 2 folders")
		}
		for i := 1; i < len(folders); i++ {
			if folders[i].SortOrder < folders[i-1].SortOrder {
				t.Fatal("folders not sorted by sortOrder")
			}
		}
	})

	t.Run("UpdateFolder_Name", func(t *testing.T) {
		folder, _ := svc.CreateFolder("OldName", 0)
		updated, err := svc.UpdateFolder(folder.ID, map[string]interface{}{"Name": "NewName"})
		if err != nil {
			t.Fatalf("UpdateFolder failed: %v", err)
		}
		if updated.Name != "NewName" {
			t.Fatalf("expected name 'NewName', got %q", updated.Name)
		}
	})

	t.Run("UpdateFolder_ParentId", func(t *testing.T) {
		parent, _ := svc.CreateFolder("NewParent", 0)
		child, _ := svc.CreateFolder("Movable", 0)
		updated, err := svc.UpdateFolder(child.ID, map[string]interface{}{"ParentID": parent.ID})
		if err != nil {
			t.Fatalf("UpdateFolder parentId failed: %v", err)
		}
		if updated.ParentID != parent.ID {
			t.Fatalf("expected parentId %d, got %d", parent.ID, updated.ParentID)
		}
	})

	t.Run("UpdateFolder_SortOrder", func(t *testing.T) {
		folder, _ := svc.CreateFolder("Reorderable", 0)
		updated, err := svc.UpdateFolder(folder.ID, map[string]interface{}{"SortOrder": 99})
		if err != nil {
			t.Fatalf("UpdateFolder sortOrder failed: %v", err)
		}
		if updated.SortOrder != 99 {
			t.Fatalf("expected sortOrder 99, got %d", updated.SortOrder)
		}
	})

	t.Run("UpdateFolder_PatchOnlySpecifiedFields", func(t *testing.T) {
		folder, _ := svc.CreateFolder("Original", 0)
		originalSortOrder := folder.SortOrder
		updated, err := svc.UpdateFolder(folder.ID, map[string]interface{}{"Name": "Patched"})
		if err != nil {
			t.Fatalf("UpdateFolder failed: %v", err)
		}
		if updated.Name != "Patched" {
			t.Fatalf("expected name 'Patched', got %q", updated.Name)
		}
		if updated.SortOrder != originalSortOrder {
			t.Fatalf("expected sortOrder %d (unchanged), got %d", originalSortOrder, updated.SortOrder)
		}
	})

	t.Run("DeleteFolder_SoftDelete", func(t *testing.T) {
		folder, _ := svc.CreateFolder("ToDelete", 0)
		if err := svc.DeleteFolder(folder.ID); err != nil {
			t.Fatalf("DeleteFolder failed: %v", err)
		}
		folders, _ := svc.GetFolders(false)
		for _, f := range folders {
			if f.ID == folder.ID {
				t.Fatal("expected folder to be excluded from non-trash results")
			}
		}
		trash, err := svc.GetFolders(true)
		if err != nil {
			t.Fatalf("GetFolders trash failed: %v", err)
		}
		found := false
		for _, f := range trash {
			if f.ID == folder.ID {
				found = true
				if !f.Del {
					t.Fatal("expected del=true for deleted folder")
				}
				break
			}
		}
		if !found {
			t.Fatal("expected folder in trash results")
		}
	})

	t.Run("UpdateNonExistentFolder_ReturnsError", func(t *testing.T) {
		_, err := svc.UpdateFolder(99999, map[string]interface{}{"Name": "Nope"})
		if err == nil {
			t.Fatal("expected error when updating non-existent folder")
		}
	})
}
