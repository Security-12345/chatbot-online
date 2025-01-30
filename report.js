// Password for report generation
const REPORT_PASSWORD = "gatehouse";

// Add event listener to the button
document.getElementById("generate-report-button").addEventListener("click", () => {
    const password = prompt("Please enter the password to generate the report:");
    if (password === REPORT_PASSWORD) {
        generateMonthlyReport();
    } else {
        alert("Incorrect password! You do not have permission to generate the report.");
    }
});

async function generateMonthlyReport() {
    // Fetch data from IndexedDB
    const dbRequest = indexedDB.open("permitDB", 1);
    dbRequest.onsuccess = async function (event) {
        const db = event.target.result;
        const transaction = db.transaction("permits", "readonly");
        const store = transaction.objectStore("permits");

        const permits = await getAllData(store);
        if (permits.length === 0) {
            alert("No permits found for the report.");
            return;
        }

        // Process data to generate the report with unit headings
        const reportData = processReportData(permits);

        // Generate the PDF
        generatePDF(reportData);
    };

    dbRequest.onerror = function () {
        alert("Error accessing the database. Please try again later.");
    };
}

// Fetch all data from the store
function getAllData(store) {
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = function () {
            resolve(request.result);
        };
        request.onerror = function () {
            reject("Error fetching data.");
        };
    });
}

// Process data to group by unit number
function processReportData(permits) {
    const groupedData = {};
    permits.forEach((permit) => {
        const unitNumber = permit.unitNumber;
        if (!groupedData[unitNumber]) {
            groupedData[unitNumber] = [];
        }
        groupedData[unitNumber].push(permit);
    });
    return groupedData;
}

// Generate the PDF with jsPDF
function generatePDF(data) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    // Add title and header
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.text("Monthly Report", 105, 15, { align: "center" });

    pdf.setFontSize(14);
    pdf.text("Gatehouse Vehicle Report", 105, 25, { align: "center" });
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 200, 10, {
        align: "right",
    });

    // Add watermark
    pdf.setFontSize(40);
    pdf.setTextColor(200, 200, 200);
    pdf.text("Gatehouse", 105, 150, { align: "center", angle: 45 });

    // Reset text color and font
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");

    let yPosition = 35;

    Object.keys(data).forEach((unitNumber) => {
        // Add Unit Heading
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Unit: ${unitNumber}`, 20, yPosition);
        yPosition += 10;

        // Create table headers
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text("License Plate", 20, yPosition);
        pdf.text("Visitor Name", 70, yPosition);
        pdf.text("Officer Name", 120, yPosition);
        pdf.text("Issue Date", 170, yPosition);
        yPosition += 5;
        pdf.line(20, yPosition, 190, yPosition); // Add line under headers
        yPosition += 5;

        // Add Unit Data in Table Format
        data[unitNumber].forEach((permit) => {
            pdf.text(permit.licensePlateNo, 20, yPosition);
            pdf.text(permit.visitorName, 70, yPosition);
            pdf.text(permit.officerName, 120, yPosition);
            pdf.text(permit.issueDate, 170, yPosition);
            yPosition += 7;

            // Page break if content exceeds page height
            if (yPosition > 270) {
                pdf.addPage();
                yPosition = 20;

                // Re-add table headers on new page
                pdf.setFontSize(10);
                pdf.text("License Plate", 20, yPosition);
                pdf.text("Visitor Name", 70, yPosition);
                pdf.text("Officer Name", 120, yPosition);
                pdf.text("Issue Date", 170, yPosition);
                yPosition += 5;
                pdf.line(20, yPosition, 190, yPosition); // Add line under headers
                yPosition += 5;
            }
        });
        yPosition += 10;
    });

    // Add footer with page numbers
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
    }

    // Save the PDF
    pdf.save("Gatehouse_Vehicle_Report.pdf");
}
