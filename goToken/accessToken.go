package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"os"
	"os/user"
	"path/filepath"

	"golang.org/x/crypto/acme/autocert"
)

const (
	domain = "50.25.89.34.bc.googleusercontent.com"

	oauthURI    = "https://github.com/login/oauth/access_token"
	oauthClient = "5fe44fa4c9d29308052b"
)

var (
	oauthSecret string
)

type request struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	Code         string `json:"code"`
	State        string `json:"state"`
}

func handleAccessTokenRequest(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()

	code := r.Form.Get("code")
	state := r.Form.Get("state")
	if len(code) == 0 || len(state) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	origin := r.Header.Get("origin")
	if origin != "https://dario-zubovic.github.io" {
		w.WriteHeader(http.StatusBadGateway)
		return
	}

	req := request{
		ClientID:     oauthClient,
		ClientSecret: oauthSecret,
		Code:         code,
		State:        state,
	}

	buf := &bytes.Buffer{}
	err := json.NewEncoder(buf).Encode(&req)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	request, err := http.NewRequest("POST", oauthURI, buf)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	request.Header.Add("Accept", "application/json")

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	bytes, err := ioutil.ReadAll(response.Body)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(bytes)
	w.WriteHeader(http.StatusOK)
}

func main() {
	oauthSecret = os.Args[1]

	certManager := autocert.Manager{
		Prompt:     autocert.AcceptTOS,
		HostPolicy: autocert.HostWhitelist(domain),
	}

	dir := cacheDir()
	if dir != "" {
		certManager.Cache = autocert.DirCache(dir)
	}

	server := &http.Server{
		Addr: ":https",
		TLSConfig: &tls.Config{
			GetCertificate: certManager.GetCertificate,
		},
	}

	http.HandleFunc("/access_token", handleAccessTokenRequest)

	err := server.ListenAndServeTLS("", "")
	panic(err)
}

func cacheDir() (dir string) {
	if u, _ := user.Current(); u != nil {
		dir = filepath.Join(os.TempDir(), "cache-golang-autocert-"+u.Username)
		if err := os.MkdirAll(dir, 0700); err == nil {
			return dir
		}
	}
	return ""
}
