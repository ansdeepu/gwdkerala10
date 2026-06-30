// src/lib/schemas/DataEntrySchema.ts
import { z } from 'zod';
import { format, parse, isValid } from 'date-fns';
import { ApplicationFeeSchema, OwnerInfoSchema, RigRegistrationSchema, agencyRigTypeOptions, MediaItemSchema } from './eTenderSchema';
import type { RigRegistration, ApplicationFee, OwnerInfo, MediaItem } from './eTenderSchema';

// --- User & Auth Schemas ---
export const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});
export type LoginFormData = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ['confirmPassword'],
});
export type RegisterFormData = z.infer<typeof RegisterSchema>;

export const NewUserByAdminSchema = z.object({
  designation: z.string().min(1, "Please select a designation."),
  staffId: z.string({ required_error: "Please select a staff member." }).min(1, "Please select a staff member."),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});
export type NewUserByAdminFormData = z.infer<typeof NewUserByAdminSchema>;

export const userRoleOptions = ['superAdmin', 'admin', 'scientist', 'engineer', 'investigator', 'supervisor', 'viewer'] as const;
export type UserRole = typeof userRoleOptions[number];
// --- End User & Auth Schemas ---


export const optionalNumber = (errorMessage: string = "Must be a valid number.") =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    if (typeof val === 'string' && isNaN(Number(val))) return undefined;
    return val;
}, z.number({ coerce: true, invalid_type_error: errorMessage }).min(0, "Cannot be negative.").optional());

export const optionalDateSchema = z.preprocess((val) => {
  if (val instanceof Date) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const d = new Date(val);
    if (isValid(d)) return d;
  }
  return null;
}, z.date().nullable().optional());

const nativeDateSchema = z.preprocess(
  (val) => (val === "" ? null : val),
  z.string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: "Invalid date" })
);

export const designationOptions = [
    "Director",
    "Superintending Engineer (General)",
    "Superintending Engineer (NHP)",
    "Superintending Hydrogeologist (General)",
    "Superintending Hydrogeologist (NHP)",
    "Executive Engineer",
    "Senior Hydrogeologist",
    "Senior Geophysicist",
    "Assistant Executive Engineer",
    "Hydrogeologist",
    "Geophysicist",
    "Assistant Engineer",
    "Junior Hydrogeologist",
    "Junior Geophysicist",
    "Geological Assistant",
    "Geophysical Assistant",
    "Master Driller",
    "Senior Driller",
    "Driller",
    "Driller Mechanic",
    "Drilling Assistant",
    "Compressor Driver",
    "Pump Operator",
    "Driver, HDV",
    "Driver, LDV",
    "Senior Clerk",
    "Clerk",
    "U D Typist",
    "L D Typist",
    "Tracer",
    "Draftsman",
    "Lascar",
    "Office Attendant",
    "Watcher",
    "PTS",
] as const;
export type Designation = typeof designationOptions[number];

export const designationMalayalamOptions = [
    "ഡയറക്ടർ",
    "സൂപ്രണ്ടിങ് എഞ്ചിനീയർ (ജനറൽ)",
    "സൂപ്രണ്ടിങ് എഞ്ചിനീയർ (NHP)",
    "സൂപ്രണ്ടിങ് ഹൈഡ്രോജിയോളജിസ്റ്റ് (ജനറൽ)",
    "സൂപ്രണ്ടിങ് ഹൈഡ്രോജിയോളജിസ്റ്റ് (NHP)",
    "എക്സിക്യൂട്ടീവ് എഞ്ചിനീയർ",
    "സീനിയർ ഹൈഡ്രോജിയോളജിസ്റ്റ്",
    "സീനിയർ ജിയോഫിസിസിസ്റ്റ്",
    "അസിസ്റ്റന്റ് എക്സിക്യൂട്ടീവ് എഞ്ചിനീയർ",
    "ഹൈഡ്രോജിയോളജിസ്റ്റ്",
    "ജിയോഫിസിസ്റ്റ്",
    "അസിസ്റ്റന്റ് എഞ്ചിനീയർ",
    "ജൂനിയർ ഹൈഡ്രോജിയോളജിസ്റ്റ്",
    "ജൂനിയർ ജിയോഫിസിസ്റ്റ്",
    "ജിയോളജിക്കൽ അസിസ്റ്റന്റ്",
    "ജിയോഫിസിക്കൽ അസിസ്റ്റന്റ്",
    "മാസ്റ്റർ ഡ്രില്ലർ",
    "സീനിയർ ഡ്രില്ലർ",
    "ഡ്രില്ലർ",
    "ഡ്രില്ലർ മെക്കാനിക്ക്",
    "ഡ്രില്ലിംഗ് അസിസ്റ്റന്റ്‌",
    "കംപ്രസ്സർ ഡ്രൈവർ",
    "പമ്പ് ഓപ്പറേറ്റർ",
    "ഡ്രൈവർ, എച്ച്ഡിവി",
    "ഡ്രൈവർ, എൽഡിവി",
    "സീനിയർ ക്ലർക്ക്",
    "ക്ലർക്ക്",
    "യു.ഡി ടൈപ്പിസ്റ്റ്",
    "എൽ.ഡി ടൈപ്പിസ്റ്റ്",
    "ട്രേസർ",
    "ഡ്രാഫ്റ്റ്‌സ്മാൻ",
    "ലാസ്കർ",
    "ഓഫീസ് അറ്റൻഡന്റ്",
    "വാച്ചർ",
    "പിടിഎസ്"
] as const;
export type DesignationMalayalam = typeof designationMalayalamOptions[number];

export const staffStatusOptions = ["Active", "Transferred", "Retired", "Pending Transfer"] as const;
export type StaffStatusType = typeof staffStatusOptions[number];

export const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = typeof bloodGroupOptions[number];

const optionalStringSchema = z.string().optional().nullable();

export const StaffMemberFormDataSchema = z.object({
  name: z.string().min(1, "Name is required."),
  nameMalayalam: optionalStringSchema,
  designation: z.enum(designationOptions),
  designationMalayalam: z.enum(designationMalayalamOptions).optional().nullable(),
  parentsName: optionalStringSchema,
  pen: optionalStringSchema,
  bloodGroup: z.enum(bloodGroupOptions).optional().nullable(),
  email: z.string().email().optional().or(z.literal('')),
  dateOfBirth: optionalDateSchema,
  serviceStartDate: optionalDateSchema,
  serviceEndDate: optionalDateSchema,
  phoneNo: optionalStringSchema,
  roles: optionalStringSchema,
  photoUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(staffStatusOptions),
  remarks: optionalStringSchema,
  officeLocation: z.string().optional().nullable(),
  createUserAccount: z.boolean().optional(),
});
export type StaffMemberFormData = z.infer<typeof StaffMemberFormDataSchema>;

export const StaffMemberSchema = StaffMemberFormDataSchema.extend({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  targetOffice: optionalStringSchema, // for transfers
});
export type StaffMember = z.infer<typeof StaffMemberSchema>;

export const rcStatusOptions = ["Active", "Garaged"] as const;
export type RCStatus = typeof rcStatusOptions[number];

export const rigStatusOptions = ["Active", "Garaged"] as const;
export type RigStatus = typeof rigStatusOptions[number];

export const DepartmentVehicleSchema = z.object({
  id: z.string().optional(),
  registrationNumber: z.string().min(1, "Registration number is required."),
  model: optionalStringSchema,
  typeOfVehicle: optionalStringSchema,
  vehicleClass: optionalStringSchema,
  rcStatus: z.enum(rcStatusOptions).optional(),
  fuelConsumptionRate: optionalStringSchema,
  registrationDate: optionalDateSchema,
  fitnessExpiry: optionalDateSchema,
  taxExpiry: optionalDateSchema,
  insuranceExpiry: optionalDateSchema,
  pollutionExpiry: optionalDateSchema,
  fuelTestExpiry: optionalDateSchema,
});
export type DepartmentVehicle = z.infer<typeof DepartmentVehicleSchema>;

export const HiredVehicleSchema = z.object({
  id: z.string().optional(),
  registrationNumber: z.string().min(1, "Registration number is required."),
  model: optionalStringSchema,
  ownerName: optionalStringSchema,
  ownerAddress: optionalStringSchema,
  agreementValidity: optionalDateSchema,
  vehicleClass: optionalStringSchema,
  registrationDate: optionalDateSchema,
  rcStatus: z.enum(rcStatusOptions).optional(),
  hireCharges: optionalNumber(),
  fitnessExpiry: optionalDateSchema,
  taxExpiry: optionalDateSchema,
  insuranceExpiry: optionalDateSchema,
  pollutionExpiry: optionalDateSchema,
  permitExpiry: optionalDateSchema,
});
export type HiredVehicle = z.infer<typeof HiredVehicleSchema>;

export const RigCompressorSchema = z.object({
  id: z.string().optional(),
  typeOfRigUnit: z.string().min(1, "Type of rig unit is required."),
  status: z.enum(rigStatusOptions).optional(),
  fuelConsumption: optionalStringSchema,
  rigVehicleRegNo: optionalStringSchema,
  compressorVehicleRegNo: optionalStringSchema,
  supportingVehicleRegNo: optionalStringSchema,
  compressorDetails: optionalStringSchema,
  remarks: optionalStringSchema,
  isExternal: z.boolean().optional().default(false),
  externalOffice: optionalStringSchema,
});
export type RigCompressor = z.infer<typeof RigCompressorSchema>;

export const PUBLIC_DEPOSIT_APPLICATION_TYPES = ["LSGD", "Government_Institution", "Government_Water_Authority", "Government_PMKSY", "Government_Others", "Other_Schemes"] as const;
export const PRIVATE_APPLICATION_TYPES = ["Private_Domestic", "Private_Irrigation", "Private_Institution", "Private_Industry"] as const;
export const COLLECTOR_APPLICATION_TYPES = ["Collector_MPLAD", "Collector_MLASDF", "Collector_MLA_Asset_Development_Fund", "Collector_DRW", "Collector_SC/ST", "Collector_ARWSS", "Collector_Others"] as const;
export const PLAN_FUND_APPLICATION_TYPES = ["GWBDWS"] as const;
export const GW_INVESTIGATION_TYPES = ["GW_Investigation"] as const;
export const LOGGING_PUMPING_TEST_TYPES = ["Logging_Pumping_Test"] as const;

export const INVESTIGATION_GOVT_TYPES = ["Government Institution", "Government Water Authority", "Government Infrastructure", "Government Industry", "Government Others", "Government PMKSY", "MPLAD", "MLASDF", "MLA Asset development Fund", "Collector DRW", "Collector SC/ST", "Collector ARWSS", "Collector PMKSY", "Collector Others", "LSGD", "MGNRES", "Others", "GWBDWS", "ARS"] as const;
export const INVESTIGATION_PRIVATE_TYPES = ["Private Individuals", "Private Institution", "Private Infra structure", "Private Industry"] as const;
export const INVESTIGATION_COMPLAINT_TYPES = ["Complaints Illegal Well Construction", "Complaints Groundwater extraction without NOC", "Complaints Groundwater Pollution", "Complaints Chief Minister’s Grievance Redressal Cell", "Complaints Others"] as const;

export const LOGGING_PUMPING_TEST_GOVT_TYPES = [...INVESTIGATION_GOVT_TYPES];
export const LOGGING_PUMPING_TEST_PRIVATE_TYPES = [...INVESTIGATION_PRIVATE_TYPES];

export const applicationTypeOptions = [...PRIVATE_APPLICATION_TYPES, ...PUBLIC_DEPOSIT_APPLICATION_TYPES, ...COLLECTOR_APPLICATION_TYPES, ...PLAN_FUND_APPLICATION_TYPES, ...GW_INVESTIGATION_TYPES, ...LOGGING_PUMPING_TEST_TYPES, ...INVESTIGATION_GOVT_TYPES, ...INVESTIGATION_PRIVATE_TYPES, ...INVESTIGATION_COMPLAINT_TYPES, ...LOGGING_PUMPING_TEST_GOVT_TYPES, ...LOGGING_PUMPING_TEST_PRIVATE_TYPES] as const;
export type ApplicationType = typeof applicationTypeOptions[number];

export const applicationTypeDisplayMap = Object.fromEntries(applicationTypeOptions.map(option => [option, option.replace(/_/g, " ")])) as Record<ApplicationType, string>;

export const constituencyOptions = ["Chadayamangalam", "Chathannoor", "Chavara", "Eravipuram", "Kollam", "Kottarakkara", "Kundara", "Kunnathur", "Karunagappally", "Pathanapuram", "Punalur"] as const;
export type Constituency = string;

export const remittedAccountOptions = ["Bank", "STSB", "Revenue Head", "Plan Fund"] as const;
export type RemittedAccount = typeof remittedAccountOptions[number];

export const RemittanceDetailSchema = z.object({
  id: z.string().optional(),
  amountRemitted: optionalNumber("Amount Remitted must be a valid number."),
  dateOfRemittance: z.string().min(1, "Date is required."),
  remittedAccount: z.enum(remittedAccountOptions, { required_error: "Account is required." }),
  remittanceRemarks: z.string().optional().nullable(),
});
export type RemittanceDetailFormData = z.infer<typeof RemittanceDetailSchema>;

export const reappropriationTypeOptions = ["Inward", "Outward"] as const;
export type ReappropriationType = typeof reappropriationTypeOptions[number];

export const ReappropriationDetailSchema = z.object({
  id: z.string().optional(),
  type: z.enum(reappropriationTypeOptions).default("Outward"),
  pageType: z.string().optional().nullable(),
  refFileNo: z.string().min(1, "Reference File No. is required."),
  fileDetails: z.string().optional().nullable(),
  amount: optionalNumber().refine(val => val !== undefined && val > 0, "Amount must be greater than zero."),
  date: z.string().min(1, "Date is required."),
  remarks: z.string().optional().nullable(),
});
export type ReappropriationDetailFormData = z.infer<typeof ReappropriationDetailSchema>;

export const paymentAccountOptions = ["Bank", "STSB", "Plan Fund"] as const;
export type PaymentAccount = typeof paymentAccountOptions[number];

export const PaymentDetailSchema = z.object({
  id: z.string().optional(),
  remittanceId: z.string().optional().nullable(),
  dateOfPayment: z.string().min(1, "Date of payment is required."),
  paymentAccount: z.enum(paymentAccountOptions, { required_error: "Payment account is required." }),
  revenueHead: optionalNumber(),
  contractorsPayment: optionalNumber(),
  gst: optionalNumber(),
  incomeTax: optionalNumber(),
  kbcwb: optionalNumber(),
  refundToParty: optionalNumber(),
  totalPaymentPerEntry: z.coerce.number().optional(),
  paymentRemarks: z.string().optional().nullable(),
});
export type PaymentDetailFormData = z.infer<typeof PaymentDetailSchema>;

export const siteWorkStatusOptions = [
  "Under Process",
  "Additional Fund Awaited",
  "TS Pending",
  "Refund Pending",
  "Department Rig Allotted",
  "Tendered",
  "Selection Notice Issued",
  "Work Order Issued",
  "Work in Progress",
  "Work Failed",
  "Work Cancelled",
  "Work Completed",
  "Pending", // Internal Investigation fallback
  "Completed", // Internal Investigation fallback
  "VES Pending" // Internal Investigation fallback
] as const;
export type SiteWorkStatus = typeof siteWorkStatusOptions[number];

export const INVESTIGATION_WORK_STATUS_OPTIONS = ["Pending", "VES Pending", "Completed"] as const;
export const LOGGING_PUMPING_TEST_WORK_STATUS_OPTIONS = ["Under Process", "Pending", "Completed", "File Closed"] as const;

export const allFileStatusOptions = [
  "File Under Process",
  "Rig Accessibility Inspection",
  "Technical Sanction",
  "Tender Process",
  "Work Initiated",
  "Fully Completed",
  "Partially Completed",
  "Fully Completed Except Disputed",
  "Partially Completed Except Disputed",
  "Fully Disputed",
  "To be Refunded",
  "Bill Preparation",
  "Payments",
  "Utilization Certificate",
  "File Closed",
  "Pending",
  "VES Pending",
  "Completed",
  "Under Process"
] as const;
export type FileStatus = (typeof allFileStatusOptions)[number];
export const fileStatusOptions = allFileStatusOptions;

export const INVESTIGATION_FILE_STATUS_OPTIONS = ["File Under Process", "Pending", "VES Pending", "Completed", "File Closed"] as const;
export const LOGGING_PUMPING_TEST_FILE_STATUS_OPTIONS = ["Under Process", "Pending", "Completed", "File Closed"] as const;

export const LOGGING_PUMPING_TEST_PURPOSE_OPTIONS = ["Geological logging", "Geophysical Logging", "Industry Pumping test", "MWSS Pumping test", "Pumping Test Others"] as const;

export const sitePurposeOptions = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", "Pumping Scheme", "MWSS Pump Reno", "HPS", "HPR", "ARS", "GW Investigation", "Geological logging", "Geophysical Logging", "VES", "Pumping test", "Industry Pumping test", "MWSS Pumping test", "Others", "Pumping Test Others"] as const;
export type SitePurpose = typeof sitePurposeOptions[number];

export const REPORTING_PURPOSE_ORDER = [
  "GW Investigation",
  "VES",
  "Pumping test",
  "Geological logging",
  "Geophysical Logging",
  "BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", "Pumping Scheme", "MWSS Pump Reno", "HPS", "HPR", "ARS"
] as const;

export const PUMPING_TEST_AGGREGATE_PURPOSES = ["Pumping test", "Industry Pumping test", "MWSS Pumping test", "Others", "Pumping Test Others"] as const;
export const INVESTIGATION_APP_TYPE_PURPOSES = ["Geological logging", "Geophysical Logging"] as const;
export const INVESTIGATION_WELL_TYPE_PURPOSES = ["GW Investigation", "VES"] as const;

export const siteDiameterOptions = ["110 mm (4.5”)", "150 mm (6”)", "200 mm (8”)"] as const;
export type SiteDiameter = typeof siteDiameterOptions[number];

export const siteTypeOfRigOptions = ["Rotary 7", "Rotary 8", "DTH Rig", "DTH Rig, W&S", "Other Dept Rig", "Filter Point Rig", "Private Rig"] as const;
export type SiteTypeOfRig = typeof siteTypeOfRigOptions[number];

export const siteConditionsOptions = ['Accessible to Dept. Rig', 'Accessible to Private Rig', 'Inaccessible to Other Rigs', 'Land Dispute', 'Work Disputes and Conflicts'] as const;
export type SiteConditions = typeof siteConditionsOptions[number];

export const typeOfWellOptions = ["Open Well", "Pond", "Bore Well", "Tube Well", "Filter Point Well"] as const;
export type TypeOfWell = typeof typeOfWellOptions[number];

export const arsWorkStatusOptions = [
    "Proposal Submitted", 
    "AS & TS Issued", 
    "Tendered", 
    "Selection Notice Issued", 
    "Work Order Issued",
    "Work Cancelled",
    "Work in Progress", 
    "Work Failed", 
    "Work Completed"
] as const;
export type ArsStatus = typeof arsWorkStatusOptions[number];

export const arsTypeOfSchemeOptions = [
  "Dugwell Recharge",
  "Borewell Recharge",
  "Recharge Pit",
  "Check Dam",
  "Sub-Surface Dyke",
  "Pond Renovation",
  "Percolation Ponds",
] as const;

export const ArsEntrySchema = z.object({
  id: z.string().optional(),
  fileNo: z.string().min(1, 'File No is required.'),
  nameOfSite: z.string().min(1, 'Name of Site is required.'),
  localSelfGovt: z.string().min(1, "Local Self Govt. is required."),
  constituency: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.string().optional().nullable()),
  arsBlock: optionalStringSchema,
  latitude: optionalNumber(),
  longitude: optionalNumber(),
  arsTypeOfScheme: z.enum(arsTypeOfSchemeOptions).optional().nullable(),
  arsNumberOfStructures: optionalNumber(),
  arsStorageCapacity: optionalNumber(),
  arsNumberOfFillings: optionalNumber(),
  estimateAmount: optionalNumber(),
  arsAsTsDetails: optionalStringSchema,
  arsSanctionedDate: optionalDateSchema,
  tsAmount: optionalNumber(),
  arsTenderNo: optionalStringSchema,
  arsTenderedAmount: optionalNumber(),
  arsAwardedAmount: optionalNumber(),
  arsContractorName: optionalStringSchema,
  supervisorUid: optionalStringSchema,
  supervisorName: optionalStringSchema,
  noOfBeneficiary: optionalStringSchema,
  arsStatus: z.enum(arsWorkStatusOptions, { required_error: "Work Status is required." }),
  dateOfCompletion: optionalDateSchema,
  totalExpenditure: optionalNumber(),
  workRemarks: optionalStringSchema,
  workImages: z.array(MediaItemSchema).optional().default([]),
  workVideos: z.array(MediaItemSchema).optional().default([]),
}).superRefine((data, ctx) => {
    if (data.arsStatus === 'Work Completed' && !data.dateOfCompletion) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Completion Date is required when work is completed.",
            path: ["dateOfCompletion"],
        });
    }
});
export type ArsEntryFormData = z.infer<typeof ArsEntrySchema>;

export const SiteDetailSchema = z.object({
  id: z.string().optional(),
  nameOfSite: z.string().min(1, "Name of Site is required."),
  localSelfGovt: z.string().min(1, "Local Self Govt. is required."),
  constituency: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.string().optional().nullable()),
  latitude: optionalNumber(),
  longitude: optionalNumber(),
  purpose: z.string().min(1, "Purpose is required."),
  estimateAmount: optionalNumber(),
  remittedAmount: optionalNumber(),
  siteConditions: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.enum(siteConditionsOptions).optional()),
  accessibleRig: z.string().optional().nullable(),
  tsAmount: optionalNumber(),
  tenderNo: z.string().optional().nullable(),
  diameter: z.string().optional().nullable(),
  pilotDrillingDepth: z.string().optional().nullable(),
  totalDepth: optionalNumber(),
  casingPipeUsed: z.string().optional().nullable(),
  outerCasingPipe: z.string().optional().nullable(),
  innerCasingPipe: z.string().optional().nullable(),
  yieldDischarge: z.string().optional().nullable(),
  zoneDetails: z.string().optional().nullable(),
  waterLevel: z.string().optional().nullable(),
  drillingRemarks: z.string().optional().nullable().default(""),
  developingRemarks: z.string().optional().nullable().default(""),
  schemeRemarks: z.string().optional().nullable().default(""),
  descriptionOfWork: z.string().optional().nullable().default(""),
  pumpDetails: z.string().optional().nullable(),
  pumpingLineLength: z.string().optional().nullable(),
  deliveryLineLength: z.string().optional().nullable(),
  waterTankCapacity: z.string().optional().nullable(),
  noOfTapConnections: optionalNumber(),
  noOfBeneficiary: z.string().optional().nullable(),
  dateOfCompletion: nativeDateSchema.optional().nullable(),
  typeOfRig: z.preprocess((val) => (val === "" || val === null || val === '_clear_' ? undefined : val), z.string().optional()),
  contractorName: z.string().optional().nullable(),
  supervisorUid: z.string().optional().nullable(),
  supervisorName: z.string().optional().nullable(),
  supervisorDesignation: z.string().optional().nullable(),
  totalExpenditure: optionalNumber(),
  workStatus: z.enum(siteWorkStatusOptions, { required_error: "Work Status is required." }),
  implementationRemarks: z.string().optional().nullable().default(""),
  workRemarks: z.string().optional().nullable().default(""),
  surveyOB: z.string().optional().nullable(),
  surveyLocation: z.string().optional().nullable(),
  surveyPlainPipe: z.string().optional().nullable(),
  surveySlottedPipe: z.string().optional().nullable(),
  surveyRemarks: z.string().optional().nullable(),
  surveyRecommendedDiameter: z.string().optional().nullable(),
  surveyRecommendedTD: z.string().optional().nullable(),
  surveyRecommendedOB: z.string().optional().nullable(),
  surveyRecommendedCasingPipe: z.string().optional().nullable(),
  surveyRecommendedPlainPipe: z.string().optional().nullable(),
  surveyRecommendedSlottedPipe: z.string().optional().nullable(),
  surveyRecommendedMsCasingPipe: z.string().optional().nullable(),
  pondDimensions: z.string().optional().nullable(),
  arsTypeOfScheme: z.string().optional().nullable(),
  arsPanchayath: z.string().optional().nullable(),
  arsBlock: z.string().optional().nullable(),
  arsAsTsDetails: z.string().optional().nullable(),
  arsSanctionedDate: nativeDateSchema.optional().nullable(),
  arsTenderedAmount: optionalNumber(),
  arsAwardedAmount: optionalNumber(),
  arsNumberOfStructures: optionalNumber(),
  arsStorageCapacity: optionalNumber(),
  arsNumberOfFillings: optionalNumber(),
  isArsImport: z.boolean().optional().default(false),
  nameOfInvestigator: z.string().optional().nullable(),
  dateOfInvestigation: nativeDateSchema.optional().nullable(),
  typeOfWell: z.enum(typeOfWellOptions).optional().nullable(),
  vesRequired: z.preprocess((val) => val === "" || val === null ? undefined : val, z.enum(["Yes", "No"]).optional().nullable()),
  vesInvestigator: z.string().optional().nullable(),
  vesDate: nativeDateSchema.optional().nullable(),
  feasibility: z.preprocess((val) => val === "" || val === null ? undefined : val, z.enum(["Yes", "No"]).optional().nullable()),
  hydrogeologicalRemarks: z.string().optional().nullable().default(""),
  geophysicalRemarks: z.string().optional().nullable().default(""),
  workImages: z.array(MediaItemSchema).optional().default([]),
  workVideos: z.array(MediaItemSchema).optional().default([]),
}).superRefine((data, ctx) => {
    const isCompleted = data.workStatus === 'Work Completed' || data.workStatus === 'Completed';
    if (isCompleted && !data.dateOfCompletion) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Completion Date is required for this status.",
            path: ["dateOfCompletion"],
        });
    }
}).superRefine((data, ctx) => {
    const isInvestigation = data.purpose === 'GW Investigation';
    const isLoggingPumping = LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(data.purpose as any);

    if ((isInvestigation || isLoggingPumping)) {
        if (!data.typeOfWell) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Type of Well is required.", path: ["typeOfWell"] });
        }
        if (!data.workStatus) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Work Status is required.",
                path: ["workStatus"],
            });
        }
    }
}).superRefine((data, ctx) => {
    const isWellPurpose = ['BWC', 'TWC', 'FPW'].includes(data.purpose as any);
    if (isWellPurpose && !data.diameter) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Actual Diameter is required.",
            path: ["diameter"],
        });
    }
});
export type SiteDetailFormData = z.infer<typeof SiteDetailSchema>;

export const DataEntrySchema = z.object({
  id: z.string().optional(),
  fileNo: z.string().min(1, "File No. is required."),
  applicantName: z.string().min(1, "Applicant is required."),
  phoneNo: z.string().optional().nullable(),
  secondaryMobileNo: z.string().optional().nullable(),
  category: z.enum(['Govt', 'Private', 'Complaints']).optional().nullable(),
  applicationType: z.enum(applicationTypeOptions).optional().nullable(),
  constituency: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.string().optional().nullable()),
  estimateAmount: optionalNumber(),
  assignedSupervisorUids: z.array(z.string()).optional(),
  officeLocation: z.string().optional().nullable(),
  remittanceDetails: z.array(RemittanceDetailSchema),
  totalRemittance: z.coerce.number().optional(),
  reappropriationDetails: z.array(ReappropriationDetailSchema).optional().default([]),
  totalReappropriation: z.coerce.number().optional().default(0),
  totalReappropriationCredit: z.coerce.number().optional().default(0),
  siteDetails: z.array(SiteDetailSchema).optional(),
  paymentDetails: z.array(PaymentDetailSchema).optional(),
  totalPaymentAllEntries: z.coerce.number().optional(),
  overallBalance: z.coerce.number().optional(),
  fileStatus: z.enum(allFileStatusOptions as unknown as [string, ...string[]], {
    required_error: "File Status is required.",
    invalid_type_error: "Please select a valid file status."
  }),
  remarks: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  // This validation should only apply if there's a financial commitment via site estimates.
  const hasSitesWithEstimates = data.siteDetails?.some(site => site.estimateAmount && site.estimateAmount > 0);

  // If there are no sites with estimates, we don't need to enforce funding yet.
  // This allows creating a file shell that can receive re-appropriations later.
  if (!hasSitesWithEstimates) {
      return;
  }

  // Skip validation if the file status is in initial processing/draft stages.
  // This prevents blocking users who register files/site estimates before payment is recorded.
  const isInitialStage = ["File Under Process", "Under Process", "Pending"].includes(data.fileStatus);
  if (isInitialStage) {
      return;
  }

  const hasRemittances = (data.remittanceDetails && data.remittanceDetails.length > 0) || (data.totalRemittance && data.totalRemittance > 0);
  const hasReappCredit = data.totalReappropriationCredit && data.totalReappropriationCredit > 0;

  if (!hasRemittances && !hasReappCredit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A file with site estimates must have funding from at least one Remittance or an inward Re-appropriation.",
      path: ["remittanceDetails"], 
    });
  }
});
export type DataEntryFormData = z.infer<typeof DataEntrySchema>;

export const PendingUpdateSchema = z.object({
    id: z.string(),
    fileNo: z.string(),
    arsId: z.string().optional().nullable(),
    updatedSiteDetails: z.array(z.lazy(() => SiteDetailSchema.or(ArsEntrySchema))),
    fileLevelUpdates: z.object({
      fileStatus: z.string().optional().nullable(),
      remarks: z.string().optional().nullable(),
    }).optional().nullable(),
    submittedByUid: z.string(),
    submittedByName: z.string(),
    submittedAt: z.any(),
    status: z.enum(['pending', 'approved', 'rejected', 'supervisor-unassigned']),
    isArsUpdate: z.boolean(),
    reviewedByUid: z.string().optional().nullable(),
    reviewedAt: z.any().optional().nullable(),
    notes: z.string().optional().nullable(),
});
export type PendingUpdate = z.infer<typeof PendingUpdateSchema>;


// The schemas below were originally in this file and are kept for compatibility.
// In the future, they should be moved to their own specialized files.
export const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});
export type UpdatePasswordFormData = z.infer<typeof UpdatePasswordSchema>;

// Agency Registration Schemas
export const AgencyApplicationSchema = z.object({
  id: z.string().optional(),
  fileNo: z.string().optional().nullable(),
  agencyName: z.string().min(1, "Agency name & address is required."),
  owner: OwnerInfoSchema,
  partners: z.array(OwnerInfoSchema).optional().nullable(),
  
  applicationFees: z.array(ApplicationFeeSchema).optional().nullable(),

  // Agency Registration
  agencyRegistrationNo: z.string().optional().nullable(),
  agencyRegistrationDate: optionalDateSchema,
  agencyRegistrationFee: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  agencyPaymentDate: optionalDateSchema,
  agencyChallanNo: z.string().optional().nullable(),
  agencyAdditionalRegFee: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional()),
  agencyAdditionalPaymentDate: optionalDateSchema,
  agencyAdditionalChallanNo: z.string().optional().nullable(),
  
  rigs: z.array(RigRegistrationSchema),
  status: z.enum(['Active', 'Pending Verification']),
  history: z.array(z.string()).optional().nullable(),
  remarks: z.string().optional().nullable(),
  officeLocation: z.string().optional().nullable(),
});
export type AgencyApplication = z.infer<typeof AgencyApplicationSchema>;

// Settings Schemas
export interface LsgConstituencyMap {
  id: string;
  name: string; // Name of the Local Self Government
  constituencies: string[]; // Array of associated constituencies
}

export interface OfficeAddress {
  id: string;
  officeName: string;
  officeLocation: string;
  officeCode: string;
  officeNameMalayalam?: string;
  address?: string;
  addressMalayalam?: string;
  phoneNo?: string;
  email?: string;
  districtOfficerStaffId?: string;
  districtOfficer?: string;
  districtOfficerPhotoUrl?: string;
  gstNo?: string;
  panNo?: string;
  otherDetails?: string;
  stsbAccountNo?: string;
  nameOfTreasury?: string;
  bankAccountNo?: string;
  nameOfBank?: string;
  bankBranch?: string;
  bankIfsc?: string;
}

export const gwdRateCategories = [
    "GW Investigation",
    "Borewell Construction 110 mm dia (4.5\")",
    "Borewell Construction 150 mm dia (6\")",
    "Tubewell Construction 150 mm dia (6\")",
    "Tubewell Construction 200 mm dia (8\")",
    "Rotary cum DTH Drilling",
    "Filter Point Well Construction 110 mm (4.5\")",
    "Well Developing",
    "Logging & Pumping Test"
] as const;
export type GwdRateCategory = typeof gwdRateCategories[number];

// GWD Rates Schemas
export const GwdRateItemFormDataSchema = z.object({
  itemName: z.string().min(1, 'Item name is required.'),
  rate: z.coerce.number({ invalid_type_error: 'Rate must be a number.'}).min(0, 'Rate cannot be negative.'),
  category: z.enum(gwdRateCategories).optional(),
});
export type GwdRateItemFormData = z.infer<typeof GwdRateItemFormDataSchema>;

export const GwdRateItemSchema = GwdRateItemFormDataSchema.extend({
  id: z.string(),
  order: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  category: z.enum(gwdRateCategories).optional(),
});
export type GwdRateItem = z.infer<typeof GwdRateItemSchema>;
