Of course, here is the consolidated Product Functional Description (PFD).

***

## Product Functional Description: GuideCash Reporter

### **1. Overview**

**GuideCash Reporter** is a web-based Progressive Web App (PWA) designed to streamline and standardize the end-of-trip cash-up process for tour operators and their guides. The application replaces inconsistent paper or digital forms with a centralized, mobile-first digital wizard. It ensures accountability through user tracking, simplifies administration with a comprehensive dashboard, and automates oversight with scheduled reporting, ensuring all trip revenue and details are accurately and promptly recorded.

### **2. User Roles & Permissions**

The system features two primary roles with Role-Based Access Control (RBAC) enforced by middleware.

* **2.1. Admin**
    * **Access:** Full access to all application features via a secure login (email and name/password) using a JWT cookie session.
    * **Permissions:**
        * **User Management:** Create, invite, view, and deactivate Guide user accounts.
        * **Trip Oversight:** View, search, and filter all historical cash-up submissions. Update trip statuses (e.g., `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `LOCKED`).
        * **Reporting:** Access the admin dashboard to generate and download daily, monthly, and yearly reports in PDF and Excel formats. Configure and receive scheduled monthly summary reports via email.
        * **Auditing:** Has access to audit logs for key events (sign-ins, trip updates, etc.).

* **2.2. Guide (User)**
    * **Access:** Authenticated login using a registered email and name. A "forgot/reset name" flow is available. Post-login, users are redirected to the "New Cash Up" page.
    * **Permissions:**
        * Submit new cash-up forms using the multi-step wizard.
        * View a history of their own past submissions ("My Trips").
        * Download a PDF export for any single trip they have submitted.

### **3. Functional Requirements & Features**

* **3.1. Authentication & Security**
    * **Login:** Secure email and name sign-in process with JWT cookie-based sessions.
    * **Access Control:** Middleware protects routes, restricting admin pages to users with the `ADMIN` role and redirecting unauthenticated users to the sign-in page.
    * **Audit Logging:** Key actions such as sign-in, account creation, and trip modifications are logged.

* **3.2. Cash-Up Wizard (Guide Journey)**
    * **Multi-Step Interface:** A logical, user-friendly wizard for submitting trip data.
    * **Auto-Save:** Form progress is automatically saved as a local draft in the browser to prevent data loss.
    * **Step 1: Trip & Guide Identification:** Fields for trip date/time (using native-first pickers), lead guide name, and other trip details/notes.
    * **Step 2: Financials & PAX:** Inputs for total PAX (guests), cash, credit card, EFT, vouchers, agent invoices, and discounts.
    * **Step 3: Checklist & Submission:** Checkboxes/flags for operational tasks (e.g., "Payments Cleared," "Facebook Pictures Uploaded"). A summary is shown before final submission.
    * **Automated Calculation:** On submission, the system automatically calculates guide fees based on pre-defined rates (`PER_TRIP` + `PER_PAX` by rank).

* **3.3. Admin Dashboard & Management**
    * **Central Hub:** A secure, login-protected area for all administrative functions.
    * **Trip Management:** A comprehensive log of all cash-up submissions, with the ability to view full details and update the status of each trip.
    * **User Management:** A simple interface to add, deactivate, and send invites to guide users.
    * **Reporting Interface:** A dedicated section for generating and downloading on-demand reports.

* **3.4. Reporting**
    * **On-Demand Reports:** Admins can generate daily, monthly, and yearly reports in both PDF and Excel formats directly from the dashboard.
    * **Automated Email Reports:** A scheduled monthly email is sent to admins containing a summary of the month's activity along with PDF and Excel attachments.
    * **Single Trip Export:** Both Guides and Admins can download a PDF summary for any individual trip.

### **4. Non-Functional Requirements**

* **Usability:** The application must have a clean, simple, and **mobile-first** user interface. Timezone-safe defaults are used for dates.
* **Performance:** The form must load quickly, even on mobile connections, with near-instantaneous submission processing.
* **Reliability:** The application must maintain high uptime, with a robust and reliable automated email reporting system.
* **Security:** All traffic must be over HTTPS. Passwords/credentials must be securely handled.
* **Offline Capability:** The application will function as a PWA, with basic offline asset caching via a service worker and manifest file.