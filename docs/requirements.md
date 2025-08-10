# **Chit Fund Tracker App Requirements**

This document outlines the features and data requirements for a web app to track and analyze personal chit fund investments.

### **1\. Data to Track**

#### **Fund Setup**

When creating a new fund, users will provide:

* **Fund Name**: A unique name (e.g., "Sai Ram Chits 2025").  
* **Chit Value**: The total value of the fund.  
* **Monthly Installment**: The fixed monthly payment.  
* **Number of Members**: The total number of participants.  
* **Start Date**: The fund's start date.  
* **Goal for the Fund**: A personal note on the fund's purpose (e.g., "new car down payment").

#### **Monthly Data Entry**

For each month, users will log the **Dividend Received** and an optional **Prize Money Received** amount. The app will automatically mark the month as "paid" once an entry is made.

### **2\. App Functionality and Views**

The app will feature three main screens:

#### **Dashboard**

This home screen provides a high-level overview, displaying:

* **Total Profit**: The combined profit across all active funds.  
* **Fund vs. Profit Graph**: A visual comparison of each fund's performance.

#### **My Funds**

This screen lists all active funds with key details like name, chit value, and monthly installment. Tapping on a fund opens its individual view.

#### **Individual Fund View**

This detailed page provides a comprehensive analysis for a single fund, including:

* A summary of fund setup details.  
* **Current Profit** and **Return on Investment (ROI)**.  
* **Average Monthly Dividend** and **Months to Completion**.  
* A chronological list of all monthly entries.

### **3\. Strategic Bidding Insights**

This feature provides data-driven guidance on when to bid. It includes:

* **Goal-Based Strategy**: Advice for **borrowers** (bidding early) vs. **investors** (waiting for later stages).  
* **Projected Payouts**: Examples of potential prize money at different stages.  
* **Historical Bidding Trends**: A view of past winning bids within the fund.

### **4\. Advanced Analytics**

This section offers sophisticated metrics for in-depth analysis:

* **Annualized Return (XIRR)**: A powerful metric that accounts for the timing of cash flows, providing a precise, annualized percentage return comparable to other investments.  
* **Future Value Projection**: An estimate of the fund's value at completion to help users assess if they are on track to meet their financial goals.  
* **Cash Flow Analysis and Forecasting**: A visual representation of the net monthly payment for each fund (installment minus dividend). The app will use historical dividend data to forecast future cash flow, helping users plan for upcoming payments and identify potential shortfalls.  
* **FD Comparison**: A feature on the Individual Fund View that allows the user to input a Fixed Deposit interest rate and compare it directly with the fund's **Annualized Return (XIRR)**. This provides a clear benchmark to evaluate the investment's performance against a low-risk alternative.

