package common

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type ResponseBody struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Result  interface{} `json:"result"`
}

type ErrorResult struct {
	Status    int    `json:"status"`
	Path      string `json:"path"`
	Timestamp string `json:"timestamp"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, ResponseBody{
		Code:    0,
		Message: "success",
		Result:  data,
	})
}

func Error(c *gin.Context, status int, msg string) {
	c.JSON(status, ResponseBody{
		Code:    -1,
		Message: msg,
		Result: ErrorResult{
			Status:    status,
			Path:      c.Request.URL.Path,
			Timestamp: time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
		},
	})
}
