async function uploadFile() {

    let fileInput = document.getElementById("fileInput");
    let file = fileInput.files[0];

    if (!file) {
        alert("Please select a file");
        return;
    }

    let formData = new FormData();
    formData.append("file", file);

    // Show loading message
    document.getElementById("result").textContent = "Processing...";
    
    // Clear previous outputs if they exist
    if(document.getElementById("textOutput"))
        document.getElementById("textOutput").textContent = "";

    if(document.getElementById("alertOutput"))
        document.getElementById("alertOutput").textContent = "";

    if(document.getElementById("mrdOutput"))
        document.getElementById("mrdOutput").textContent = "";

    try {

        let response = await fetch("http://127.0.0.1:8000/upload", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error("Server error");
        }

        let data = await response.json();

        // Show full JSON result
        document.getElementById("result").textContent =
            JSON.stringify(data, null, 2);

        // Show extracted text
        if(document.getElementById("textOutput"))
            document.getElementById("textOutput").textContent =
                data.extracted_text || "No text detected";

        // Show nurse alerts
        if(document.getElementById("alertOutput"))
            document.getElementById("alertOutput").textContent =
                JSON.stringify(data.alerts, null, 2);



    } catch (error) {

        console.error(error);

        document.getElementById("result").textContent =
            "Error processing file. Please check the backend server.";
    }
}