// Authentic Alhambra Bank & Trust Form Fields
// Based on 2025ABTIndividualFormApplication.pdf and 2025ABTcORPORATEFormApplication.pdf

export const individualFormFields = [
  // Step 1: Personal Details - Primary Client
  {
    step: 1,
    title: "Personal Details - Primary Client",
    fields: [
      { name: "firstName", label: "First Name", type: "text", required: true },
      { name: "middleName", label: "Middle Name", type: "text", required: false },
      { name: "lastName", label: "Last Name", type: "text", required: true },
      { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
      { name: "countryOfBirth", label: "Country of Birth", type: "text", required: true },
      { name: "passportNumber", label: "Passport Number", type: "text", required: true },
      { name: "countryOfIssuance", label: "Country of Issuance", type: "text", required: true }
    ]
  },
  
  // Step 2: Address Information
  {
    step: 2,
    title: "Address Information",
    fields: [
      // Residence Address
      { name: "residenceAddress", label: "Residence Address", type: "text", required: true },
      { name: "residenceApt", label: "Apt, Suite, Floor, etc.", type: "text", required: false },
      { name: "residenceState", label: "State/Province", type: "text", required: true },
      { name: "residencePostalCode", label: "Postal Code", type: "text", required: true },
      { name: "residenceCountry", label: "Country", type: "text", required: true },
      
      // Mailing Address
      { name: "mailingAddress", label: "Mailing Address", type: "text", required: true },
      { name: "mailingApt", label: "Apt, Suite, Floor, etc.", type: "text", required: false },
      { name: "mailingState", label: "State/Province", type: "text", required: true },
      { name: "mailingPostalCode", label: "Postal Code", type: "text", required: true },
      { name: "mailingCountry", label: "Country", type: "text", required: true },
      
      { name: "contactNumber", label: "Contact Number", type: "tel", required: true },
      { name: "homePhoneNumber", label: "Home Phone Number", type: "tel", required: false }
    ]
  },

  // Step 3: Secondary Client Details (Optional)
  {
    step: 3,
    title: "Secondary Client Details (Optional)",
    fields: [
      { name: "secondaryFirstName", label: "First Name", type: "text", required: false },
      { name: "secondaryMiddleName", label: "Middle Name", type: "text", required: false },
      { name: "secondaryLastName", label: "Last Name", type: "text", required: false },
      { name: "secondaryDateOfBirth", label: "Date of Birth", type: "date", required: false },
      { name: "secondaryCountryOfBirth", label: "Country of Birth", type: "text", required: false },
      { name: "secondaryPassportNumber", label: "Passport Number", type: "text", required: false },
      { name: "secondaryCountryOfIssuance", label: "Country of Issuance", type: "text", required: false }
    ]
  },

  // Step 4: Employment Details
  {
    step: 4,
    title: "Employment Details",
    fields: [
      { name: "employmentStatus", label: "Employment Status", type: "select", required: true, 
        options: ["Employed", "Self-Employed", "Retired", "Other"] },
      { name: "occupationJobTitle", label: "Occupation or Job Title", type: "text", required: true },
      { name: "companyName", label: "Name of Company/Employer/Industry", type: "text", required: true },
      { name: "employerAddress", label: "Employer Address", type: "text", required: true },
      { name: "employerApt", label: "Apt, Suite, Floor, etc.", type: "text", required: false },
      { name: "employerState", label: "State/Province", type: "text", required: true },
      { name: "employerPostalCode", label: "Postal Code", type: "text", required: true },
      { name: "employerCountry", label: "Country", type: "text", required: true },
      { name: "employerPhone", label: "Phone Number", type: "tel", required: true },
      { name: "employerEmail", label: "Email Address", type: "email", required: true }
    ]
  },

  // Step 5: Financial Details & Investment Profile
  {
    step: 5,
    title: "Financial Details & Investment Profile",
    fields: [
      // OECD CRS Status
      { name: "taxResidenceCountry", label: "Tax Residence Country", type: "text", required: true },
      { name: "taxpayerIdNumber", label: "Taxpayer Identification Number", type: "text", required: true },
      
      // Account Type
      { name: "accountType", label: "Type of Account", type: "checkbox", required: true,
        options: ["CD", "Money Market"] },
      
      // Investment Options
      { name: "investmentType", label: "Investment Type", type: "checkbox", required: false,
        options: ["Stocks", "Bonds", "ETF", "Mutual Funds", "Real Estate", "Others"] },
      
      // Annual Income Range
      { name: "annualIncome", label: "Annual Income Range", type: "radio", required: true,
        options: ["$100,000-$250,000", "$250,001-$500,000", "$500,001-$1,000,000", "Greater than $1,000,000"] },
      
      // Source of Wealth
      { name: "sourceOfWealth", label: "Source of Wealth", type: "checkbox", required: true,
        options: [
          "Income from employment/business activity",
          "Income from dividends/interests", 
          "Income from real estate/rent",
          "Donation/inheritance/divorce settlement",
          "Income from sale of assets",
          "Other source of income"
        ] },
      
      // Investment Profile
      { name: "investmentObjective", label: "Investment Objectives/Strategy", type: "radio", required: true,
        options: [
          "Conservative: Focus on low-risk investments",
          "Conservative to Moderate: Include a mix of bonds and stable stocks",
          "Moderate: Balance between stocks and bonds",
          "Growth & Income: Emphasize growth stocks with some income-generating assets",
          "Aggressive: Prioritize high-risk, high-reward investments"
        ] },
      
      { name: "timeHorizon", label: "Time Horizon of Investment Objectives", type: "radio", required: true,
        options: ["Up to 1 year", "Between 1 and 5 years", "More than 5 years"] },
      
      { name: "investmentExperience", label: "Level of Investment Experience", type: "radio", required: true,
        options: ["Little Knowledge (1-5 Years)", "Moderate Knowledge (5-10 Years)", "Very Knowledgeable (Over 10 Years)"] }
    ]
  },

  // Step 6: Confirmation & US Status
  {
    step: 6,
    title: "Confirmation & US Status",
    fields: [
      { name: "usResident", label: "Are you a U.S. resident or citizen, or do you have any other relationship with the U.S.?", 
        type: "radio", required: true, options: ["Yes", "No"] },
      { name: "usName", label: "Name (if US resident)", type: "text", required: false },
      { name: "usTaxId", label: "Tax Identification Number", type: "text", required: false },
      { name: "usAddress", label: "Address", type: "text", required: false },
      { name: "usApt", label: "Apt, Suite, Floor, etc.", type: "text", required: false },
      { name: "usState", label: "State/Province", type: "text", required: false },
      { name: "usPostalCode", label: "Postal Code", type: "text", required: false },
      { name: "usCountry", label: "Country", type: "text", required: false }
    ]
  }
];

export const corporateFormFields = [
  // Step 1: Corporate Details
  {
    step: 1,
    title: "Corporate Details",
    fields: [
      { name: "companyName", label: "Name of the Company", type: "text", required: true },
      { name: "countryOfIncorporation", label: "Country of Incorporation", type: "text", required: true },
      { name: "registrationNumber", label: "Registration Number", type: "text", required: true },
      { name: "website", label: "Website", type: "url", required: false },
      { name: "countryOfBirth", label: "Country of Birth", type: "text", required: false },
      
      // Type of Entity
      { name: "entityType", label: "Type of Entity", type: "checkbox", required: true,
        options: ["LLC", "Partnership", "Corporation", "Trust", "Others"] },
      { name: "entityOther", label: "Other Entity Type", type: "text", required: false }
    ]
  },

  // Step 2: Registered Office & Mailing Address
  {
    step: 2,
    title: "Registered Office & Mailing Address",
    fields: [
      // Registered Office Address
      { name: "registeredAddress", label: "Registered Office Address", type: "text", required: true },
      { name: "registeredApt", label: "Apt, Suite, Floor, etc.", type: "text", required: false },
      { name: "registeredState", label: "State/Province", type: "text", required: true },
      { name: "registeredPostalCode", label: "Postal Code", type: "text", required: true },
      { name: "registeredCountry", label: "Country", type: "text", required: true },
      
      // Mailing Address
      { name: "mailingAddress", label: "Mailing Address", type: "text", required: true },
      { name: "mailingApt", label: "Apt, Suite, Floor, etc.", type: "text", required: false },
      { name: "mailingState", label: "State/Province", type: "text", required: true },
      { name: "mailingPostalCode", label: "Postal Code", type: "text", required: true },
      { name: "mailingCountry", label: "Country", type: "text", required: true },
      
      { name: "phoneNumber", label: "Phone Number", type: "tel", required: true },
      { name: "faxNumber", label: "Fax Number", type: "tel", required: false },
      { name: "email", label: "Email", type: "email", required: true }
    ]
  },

  // Step 3: Primary Client Details
  {
    step: 3,
    title: "Primary Client Details",
    fields: [
      { name: "primaryFirstName", label: "First Name", type: "text", required: true },
      { name: "primaryMiddleName", label: "Middle Name", type: "text", required: false },
      { name: "primaryLastName", label: "Last Name", type: "text", required: true },
      { name: "primaryDateOfBirth", label: "Date of Birth", type: "date", required: true },
      { name: "primaryCountryOfBirth", label: "Country of Birth", type: "text", required: true },
      { name: "primaryPassportNumber", label: "Passport Number", type: "text", required: true },
      { name: "primaryCountryOfIssuance", label: "Country of Issuance", type: "text", required: true }
    ]
  },

  // Step 4: Secondary Beneficial Owner
  {
    step: 4,
    title: "Secondary Beneficial Owner",
    fields: [
      { name: "secondaryFirstName", label: "First Name", type: "text", required: false },
      { name: "secondaryMiddleName", label: "Middle Name", type: "text", required: false },
      { name: "secondaryLastName", label: "Last Name", type: "text", required: false },
      { name: "secondaryDateOfBirth", label: "Date of Birth", type: "date", required: false },
      { name: "secondaryCountryOfBirth", label: "Country of Birth", type: "text", required: false },
      { name: "secondaryPassportNumber", label: "Passport Number", type: "text", required: false },
      { name: "secondaryCountryOfIssuance", label: "Country of Issuance", type: "text", required: false }
    ]
  },

  // Step 5: Authorized Signatories
  {
    step: 5,
    title: "Authorized Signatories",
    fields: [
      // Management Company
      { name: "managementCompanyName", label: "Management Company Name", type: "text", required: false },
      
      // Primary Authorized Person
      { name: "primaryAuthFirstName", label: "Primary Authorized - First Name", type: "text", required: true },
      { name: "primaryAuthMiddleName", label: "Primary Authorized - Middle Name", type: "text", required: false },
      { name: "primaryAuthLastName", label: "Primary Authorized - Last Name", type: "text", required: true },
      { name: "primaryAuthDateOfBirth", label: "Primary Authorized - Date of Birth", type: "date", required: true },
      { name: "primaryAuthCountryOfBirth", label: "Primary Authorized - Country of Birth", type: "text", required: true },
      { name: "primaryAuthPassportNumber", label: "Primary Authorized - Passport Number", type: "text", required: true },
      { name: "primaryAuthCountryOfIssuance", label: "Primary Authorized - Country of Issuance", type: "text", required: true },
      
      // Secondary Authorized Person
      { name: "secondaryAuthFirstName", label: "Secondary Authorized - First Name", type: "text", required: false },
      { name: "secondaryAuthMiddleName", label: "Secondary Authorized - Middle Name", type: "text", required: false },
      { name: "secondaryAuthLastName", label: "Secondary Authorized - Last Name", type: "text", required: false },
      { name: "secondaryAuthDateOfBirth", label: "Secondary Authorized - Date of Birth", type: "date", required: false },
      { name: "secondaryAuthCountryOfBirth", label: "Secondary Authorized - Country of Birth", type: "text", required: false },
      { name: "secondaryAuthPassportNumber", label: "Secondary Authorized - Passport Number", type: "text", required: false },
      { name: "secondaryAuthCountryOfIssuance", label: "Secondary Authorized - Country of Issuance", type: "text", required: false }
    ]
  },

  // Step 6: Third Client Details (Optional)
  {
    step: 6,
    title: "Third Client Details (Optional)",
    fields: [
      { name: "thirdFirstName", label: "First Name", type: "text", required: false },
      { name: "thirdMiddleName", label: "Middle Name", type: "text", required: false },
      { name: "thirdLastName", label: "Last Name", type: "text", required: false },
      { name: "thirdDateOfBirth", label: "Date of Birth", type: "date", required: false },
      { name: "thirdCountryOfBirth", label: "Country of Birth", type: "text", required: false },
      { name: "thirdPassportNumber", label: "Passport Number", type: "text", required: false },
      { name: "thirdCountryOfIssuance", label: "Country of Issuance", type: "text", required: false }
    ]
  },

  // Step 7: Employment & Financial Details
  {
    step: 7,
    title: "Employment & Financial Details",
    fields: [
      // Primary Beneficial Owner Employment
      { name: "primaryOccupation", label: "Primary Owner - Occupation or Job Title", type: "text", required: true },
      { name: "primaryCompanyName", label: "Primary Owner - Name of Company/Employer/Industry", type: "text", required: true },
      { name: "primaryEmployerAddress", label: "Primary Owner - Employer Address", type: "text", required: true },
      { name: "primaryEmployerApt", label: "Primary Owner - Apt, Suite, Floor, etc.", type: "text", required: false },
      { name: "primaryEmployerState", label: "Primary Owner - State/Province", type: "text", required: true },
      { name: "primaryEmployerPostalCode", label: "Primary Owner - Postal Code", type: "text", required: true },
      { name: "primaryEmployerCountry", label: "Primary Owner - Country", type: "text", required: true },
      { name: "primaryEmployerPhone", label: "Primary Owner - Phone Number", type: "tel", required: true },
      { name: "primaryEmployerEmail", label: "Primary Owner - Email Address", type: "email", required: true }
    ]
  }
];

export const formSubmissionInstructions = {
  individual: {
    title: "Individual Account Opening Form Submission Instructions",
    instructions: [
      "Complete and sign your application using black ink.",
      "Gather all specified requirements listed in the form.",
      "Return your completed and signed application along with the specified requirements via any of the following methods:"
    ],
    submissionMethods: [
      {
        method: "Scan & Email (recommended)",
        email: "abt@abt.ky",
        formats: "Acceptable file formats include: JPG, JPEG, PNG, PDF",
        note: "Include your Name in the Email Subject"
      },
      {
        method: "Mail",
        address: "750 B St. Suite 2850, Symphony Towers, San Diego 92101, California, United States"
      }
    ]
  },
  corporate: {
    title: "Corporate Account Opening Form Submission Instructions",
    instructions: [
      "Complete and sign your application using black ink.",
      "Gather all specified requirements listed in the form.",
      "Return your completed and signed application along with the specified requirements via any of the following methods:"
    ],
    submissionMethods: [
      {
        method: "Scan & Email (recommended)",
        email: "abt@abt.ky",
        formats: "Acceptable file formats include: JPG, JPEG, PNG, PDF",
        note: "Include your Company Name in the Email Subject"
      },
      {
        method: "Mail",
        address: "750 B St. Suite 2850, Symphony Towers, San Diego 92101, California, United States"
      }
    ]
  }
};
