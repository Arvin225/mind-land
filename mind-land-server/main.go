package main

import (
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"mind-land-server/diary"
	"mind-land-server/slipbox"
	"mind-land-server/todo"
	"mind-land-server/upload"
)

func main() {
	db, err := gorm.Open(sqlite.Open("mind-land.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database: " + err.Error())
	}

	if err := db.AutoMigrate(&slipbox.Card{}, &slipbox.Tag{}, &todo.List{}, &todo.Item{}, &diary.DiaryEntry{}); err != nil {
		panic("failed to auto migrate: " + err.Error())
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: false,
	}))

	api := r.Group("/api")
	{
		// SlipBox
		slipSvc := slipbox.NewService(db)
		slipH := slipbox.NewHandler(slipSvc)

		slip := api.Group("/slip-box")
		{
			slip.GET("/cards", slipH.GetCards)
			slip.GET("/cards/:id", slipH.GetCard)
			slip.GET("/tags", slipH.GetAllTags)
			slip.GET("/tags/:id", slipH.GetTag)
			slip.POST("/cards", slipH.CreateCard)
			slip.PUT("/cards/:id", slipH.UpdateCard)
			slip.DELETE("/cards", slipH.DeleteCard)
			slip.DELETE("/tags", slipH.DeleteTag)
		}

		// ToDo
		todoSvc := todo.NewService(db)
		todoH := todo.NewHandler(todoSvc)

		td := api.Group("/to-do")
		{
			td.GET("/lists", todoH.GetLists)
			td.POST("/lists", todoH.CreateList)
			td.PATCH("/lists", todoH.PatchList)
			td.DELETE("/lists/:id", todoH.DeleteList)
			td.GET("/items", todoH.GetItems)
			td.POST("/items", todoH.CreateItem)
			td.PATCH("/items", todoH.PatchItem)
			td.DELETE("/items", todoH.DeleteItem)
		}

		// Upload
		api.POST("/upload", upload.HandleUpload)

		// Diary
		diarySvc := diary.NewService(db)
		diaryH := diary.NewHandler(diarySvc)

		dr := api.Group("/diary")
		{
			// GET /entries — 内部按 ?trash=true 分发到 GetTrashEntries 或 GetEntries
			dr.GET("/entries", diaryH.GetEntries)
			dr.GET("/entries/:id", diaryH.GetEntry)

			// 字面量路由必须在参数化路由之前 (否则 trash 被 :id 匹配)
			dr.DELETE("/entries/trash", diaryH.EmptyTrash)

			dr.PATCH("/entries/:id/restore", diaryH.RestoreEntry)
			dr.DELETE("/entries/:id/permanent", diaryH.PermanentDelete)
			dr.POST("/entries", diaryH.CreateEntry)
			dr.PUT("/entries/:id", diaryH.UpdateEntry)
			dr.DELETE("/entries/:id", diaryH.DeleteEntry)
		}
	}

	// Serve uploaded files
	r.Static("/uploads", "./uploads")

	// Serve static files from frontend build
	r.Static("/assets", "../mind-land-web/dist/assets")
	r.StaticFile("/favicon.ico", "../mind-land-web/dist/favicon.ico")
	r.StaticFile("/logo192.png", "../mind-land-web/dist/logo192.png")
	r.StaticFile("/manifest.json", "../mind-land-web/dist/manifest.json")

	// SPA catch-all: serve index.html for all non-API, non-asset routes
	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.JSON(404, gin.H{"code": -1, "message": "not found"})
			return
		}
		c.File("../mind-land-web/dist/index.html")
	})

	if err := r.Run(":3100"); err != nil {
		panic("failed to start server: " + err.Error())
	}
}
