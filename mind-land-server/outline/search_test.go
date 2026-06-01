package outline

import (
	"testing"
)

func TestSearchService(t *testing.T) {
	setupSearchTest := func(t *testing.T) *Service {
		db := setupTrashTestDB(t)
		svc := NewService(db)

		svc.CreateFolder("工作文档", 0)
		svc.CreateFolder("学习笔记", 0)

		doc1, _ := svc.CreateDocument("项目计划书", 0)
		doc2, _ := svc.CreateDocument("Go语言学习笔记", 0)
		svc.CreateDocument("购物清单", 0)

		db.Create(&OutlineNode{DocumentID: doc1.ID, Content: "第一阶段:需求分析", SortOrder: 0})
		db.Create(&OutlineNode{DocumentID: doc1.ID, Content: "第二阶段:系统设计", SortOrder: 1})
		db.Create(&OutlineNode{DocumentID: doc2.ID, Content: "Go语言基础语法", SortOrder: 0})
		db.Create(&OutlineNode{DocumentID: doc2.ID, Content: "并发编程详解", SortOrder: 1})

		return svc
	}

	t.Run("Search_DocumentTitleHit", func(t *testing.T) {
		svc := setupSearchTest(t)
		results, total, err := svc.Search("项目", "all", 1, 20)
		if err != nil {
			t.Fatalf("Search failed: %v", err)
		}
		if total == 0 {
			t.Fatal("expected at least 1 result for document title hit")
		}
		found := false
		for _, r := range results {
			if r["type"] == "document" && r["title"] == "项目计划书" {
				found = true
				break
			}
		}
		if !found {
			t.Fatal("expected to find document '项目计划书' in search results")
		}
	})

	t.Run("Search_FolderNameHit", func(t *testing.T) {
		svc := setupSearchTest(t)
		results, total, err := svc.Search("学习", "all", 1, 20)
		if err != nil {
			t.Fatalf("Search failed: %v", err)
		}
		if total == 0 {
			t.Fatal("expected at least 1 result for folder name hit")
		}
		found := false
		for _, r := range results {
			if r["type"] == "folder" && r["name"] == "学习笔记" {
				found = true
				break
			}
		}
		if !found {
			t.Fatal("expected to find folder '学习笔记' in search results")
		}
	})

	t.Run("Search_NodeContentHit", func(t *testing.T) {
		svc := setupSearchTest(t)
		results, total, err := svc.Search("并发", "all", 1, 20)
		if err != nil {
			t.Fatalf("Search failed: %v", err)
		}
		if total == 0 {
			t.Fatal("expected at least 1 result for node content hit")
		}
		found := false
		for _, r := range results {
			if r["type"] == "node" {
				content, _ := r["content"].(string)
				if content == "并发编程详解" {
					found = true
					break
				}
			}
		}
		if !found {
			t.Fatal("expected to find node '并发编程详解' in search results")
		}
	})

	t.Run("Search_ScopeDocuments", func(t *testing.T) {
		svc := setupSearchTest(t)
		results, total, err := svc.Search("笔记", "documents", 1, 20)
		if err != nil {
			t.Fatalf("Search failed: %v", err)
		}
		if total == 0 {
			t.Fatal("expected results with scope=documents")
		}
		for _, r := range results {
			if r["type"] != "document" {
				t.Fatalf("expected all results to be type=document, got %s", r["type"])
			}
		}
	})

	t.Run("Search_ScopeFolders", func(t *testing.T) {
		svc := setupSearchTest(t)
		results, total, err := svc.Search("工作", "folders", 1, 20)
		if err != nil {
			t.Fatalf("Search failed: %v", err)
		}
		if total == 0 {
			t.Fatal("expected results with scope=folders")
		}
		for _, r := range results {
			if r["type"] != "folder" {
				t.Fatalf("expected all results to be type=folder, got %s", r["type"])
			}
		}
	})

	t.Run("Search_ScopeNodes", func(t *testing.T) {
		svc := setupSearchTest(t)
		results, total, err := svc.Search("设计", "nodes", 1, 20)
		if err != nil {
			t.Fatalf("Search failed: %v", err)
		}
		if total == 0 {
			t.Fatal("expected results with scope=nodes")
		}
		for _, r := range results {
			if r["type"] != "node" {
				t.Fatalf("expected all results to be type=node, got %s", r["type"])
			}
		}
	})

	t.Run("Search_EmptyKeyword", func(t *testing.T) {
		svc := setupSearchTest(t)
		results, total, err := svc.Search("", "all", 1, 20)
		if err != nil {
			t.Fatalf("Search failed: %v", err)
		}
		if total != 0 || len(results) != 0 {
			t.Fatalf("expected 0 results for empty keyword, got %d items, total=%d", len(results), total)
		}
	})

	t.Run("Search_Pagination", func(t *testing.T) {
		svc := setupSearchTest(t)
		page1, total, err := svc.Search("学习", "all", 1, 1)
		if err != nil {
			t.Fatalf("Search failed: %v", err)
		}
		if len(page1) != 1 {
			t.Fatalf("expected 1 result on page 1, got %d", len(page1))
		}
		if total < 2 {
			t.Fatalf("expected total >= 2 for pagination test, got %d", total)
		}
		page2, _, _ := svc.Search("学习", "all", 2, 1)
		if len(page2) != 1 {
			t.Fatalf("expected 1 result on page 2, got %d", len(page2))
		}
		if page1[0]["type"] == page2[0]["type"] && page1[0]["id"] == page2[0]["id"] {
			t.Fatal("expected different results on page 1 and page 2")
		}
	})

	t.Run("Search_EmptyResults", func(t *testing.T) {
		svc := setupSearchTest(t)
		results, total, err := svc.Search("不存在的内容xyz", "all", 1, 20)
		if err != nil {
			t.Fatalf("Search failed: %v", err)
		}
		if total != 0 || len(results) != 0 {
			t.Fatalf("expected 0 results, got %d items, total=%d", len(results), total)
		}
	})
}
