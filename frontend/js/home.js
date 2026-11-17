document.addEventListener("DOMContentLoaded", () => {
  const reportLink = document.getElementById("reportWasteLink");
  if (!reportLink) return;

  reportLink.addEventListener("click", async (event) => {
    event.preventDefault();
    reportLink.setAttribute("aria-busy", "true");

    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (response.status === 401) {
        window.location.assign("/login.html");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to check your account. Please try again.");
      }

      const { user } = await response.json();
      const dashboards = {
        resident: "/resident.html",
        admin: "/admin.html",
        collector: "/collector.html",
      };
      window.location.assign(dashboards[user.role] || "/login.html");
    } catch (error) {
      const message = document.getElementById("homeMessage");
      message.textContent = error.message || "Unable to continue. Please try again.";
      message.hidden = false;
    } finally {
      reportLink.removeAttribute("aria-busy");
    }
  });
});
