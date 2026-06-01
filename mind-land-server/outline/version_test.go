package outline

import (
	"testing"
)

func setupVersionTest(t *testing.T) *Service {
	db := setupTrashTestDB(t)
	svc := NewService(db)

	doc, _ := svc.CreateDocument("版本测试文档", 0)
	db.Create(&OutlineNode{DocumentID: doc.ID, Content: "第一行", SortOrder: 0})
	db.Create(&OutlineNode{DocumentID: doc.ID, Content: "第二行", SortOrder: 1})

	return svc
}

func TestVersionService(t *testing.T) {
	t.Run("CreateVersion_SnapshotCreated", func(t *testing.T) {
		svc := setupVersionTest(t)
		doc, _, _ := svc.GetDocument(1, false)

		version, err := svc.CreateVersion(doc.ID, "manual")
		if err != nil {
			t.Fatalf("CreateVersion failed: %v", err)
		}
		if version.ID == 0 {
			t.Fatal("expected version ID to be non-zero")
		}
		if version.DocumentID != doc.ID {
			t.Fatalf("expected DocumentID %d, got %d", doc.ID, version.DocumentID)
		}
		if version.NodeCount != 3 {
			t.Fatalf("expected NodeCount 3 (1 initial + 2 added), got %d", version.NodeCount)
		}
		if version.Snapshot == "" {
			t.Fatal("expected snapshot to be non-empty JSON")
		}
		if version.Source != "manual" {
			t.Fatalf("expected Source 'manual', got '%s'", version.Source)
		}
	})

	t.Run("GetVersions_OrderedByTimeDesc", func(t *testing.T) {
		svc := setupVersionTest(t)
		doc, _, _ := svc.GetDocument(1, false)

		v1, _ := svc.CreateVersion(doc.ID, "auto")
		v2, _ := svc.CreateVersion(doc.ID, "manual")

		versions, err := svc.GetVersions(doc.ID)
		if err != nil {
			t.Fatalf("GetVersions failed: %v", err)
		}
		if len(versions) != 2 {
			t.Fatalf("expected 2 versions, got %d", len(versions))
		}
		if versions[0].ID != v2.ID {
			t.Fatal("expected newest version first")
		}
		if versions[1].ID != v1.ID {
			t.Fatal("expected oldest version second")
		}
	})

	t.Run("GetVersion_ReturnsDetail", func(t *testing.T) {
		svc := setupVersionTest(t)
		doc, _, _ := svc.GetDocument(1, false)

		created, _ := svc.CreateVersion(doc.ID, "manual")

		version, err := svc.GetVersion(created.ID)
		if err != nil {
			t.Fatalf("GetVersion failed: %v", err)
		}
		if version.ID != created.ID {
			t.Fatalf("expected ID %d, got %d", created.ID, version.ID)
		}
		if version.Source != "manual" {
			t.Fatalf("expected Source 'manual', got '%s'", version.Source)
		}
	})

	t.Run("RestoreVersion_NodesReplaced", func(t *testing.T) {
		svc := setupVersionTest(t)
		doc, _, _ := svc.GetDocument(1, false)

		svc.CreateVersion(doc.ID, "pre-change")

		svc.SaveNodes(doc.ID, []OutlineNode{
			{Content: "修改后的第一行", SortOrder: 0},
		})

		versions, _ := svc.GetVersions(doc.ID)
		originalVersion := versions[0]

		err := svc.RestoreVersion(originalVersion.ID)
		if err != nil {
			t.Fatalf("RestoreVersion failed: %v", err)
		}

		_, nodes, _ := svc.GetDocument(doc.ID, true)
		if len(nodes) != 3 {
			t.Fatalf("expected 3 nodes after restore, got %d", len(nodes))
		}
		if nodes[0].Content != "版本测试文档" {
			t.Fatalf("expected node content '版本测试文档', got '%s'", nodes[0].Content)
		}
	})

	t.Run("RestoreVersion_CreatesBackupVersion", func(t *testing.T) {
		svc := setupVersionTest(t)
		doc, _, _ := svc.GetDocument(1, false)

		originalVersion, _ := svc.CreateVersion(doc.ID, "original")

		svc.SaveNodes(doc.ID, []OutlineNode{
			{Content: "新内容", SortOrder: 0},
		})

		svc.RestoreVersion(originalVersion.ID)

		versions, _ := svc.GetVersions(doc.ID)
		preRestoreFound := false
		for _, v := range versions {
			if v.Source == "pre-restore" {
				preRestoreFound = true
				break
			}
		}
		if !preRestoreFound {
			t.Fatal("expected a backup version with Source='pre-restore' after RestoreVersion")
		}
	})

	t.Run("DeleteVersion_RemovesVersion", func(t *testing.T) {
		svc := setupVersionTest(t)
		doc, _, _ := svc.GetDocument(1, false)

		version, _ := svc.CreateVersion(doc.ID, "manual")

		err := svc.DeleteVersion(version.ID)
		if err != nil {
			t.Fatalf("DeleteVersion failed: %v", err)
		}

		versions, _ := svc.GetVersions(doc.ID)
		if len(versions) != 0 {
			t.Fatalf("expected 0 versions after delete, got %d", len(versions))
		}
	})
}
