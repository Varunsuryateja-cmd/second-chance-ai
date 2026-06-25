function login() {
    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value.trim();

    if (username === "" || password === "") {
        alert("Please enter username and password");
        return;
    }

    localStorage.setItem("user", username);

    window.location.href = "index.html";
}