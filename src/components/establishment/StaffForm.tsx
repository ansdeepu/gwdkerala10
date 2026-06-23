
// src/components/establishment/StaffForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatCase } from "@/lib/utils";
import { Loader2, Save, X, ImageUp, Unplug, Expand, UserCheck, Info } from "lucide-react";
import { StaffMemberFormDataSchema, type StaffMemberFormData, designationOptions, staffStatusOptions, type StaffStatusType, designationMalayalamOptions, bloodGroupOptions } from "@/lib/schemas";
import type { StaffMember, OfficeAddress } from "@/lib/schemas";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format, isValid, parseISO, parse } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";
import { Checkbox } from "../ui/checkbox";
import { useAuth, type UserProfile } from "@/hooks/useAuth";

interface StaffFormProps {
  onSubmit: (data: StaffMemberFormData) => Promise<void>;
  initialData?: StaffMember | null;
  isSubmitting: boolean;
  onCancel: () => void;
  isViewer?: boolean;
  allOfficeAddresses: OfficeAddress[];
  allUsers: UserProfile[];
}

const isValidWebUrl = (url?: string | null): boolean => {
  if (!url) return false;
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

const toDateOrNull = (value: any): Date | null => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        // Try ISO
        let d = parseISO(trimmed);
        if (isValid(d)) return d;
        
        // Try dd/MM/yyyy
        d = parse(trimmed, 'dd/MM/yyyy', new Date());
        if (isValid(d)) return d;

        // Try dd-MM-yyyy
        d = parse(trimmed, 'dd-MM-yyyy', new Date());
        if (isValid(d)) return d;
        
        // Try native fallback
        const fallback = new Date(trimmed);
        if (isValid(fallback)) return fallback;
    }
    return null;
 };

const getField = (data: any, key: string): any => {
    if (!data) return undefined;
    
    if (data[key] !== undefined && data[key] !== null) return data[key];
    
    const mappings: Record<string, string[]> = {
        'name': ['name', 'Name', 'Full Name'],
        'nameMalayalam': ['nameMalayalam', 'NameMalayalam', 'Name (Malayalam)', 'Name malayalam'],
        'designation': ['designation', 'Designation', 'Roles/Responsibilities', 'roles', 'Post'],
        'designationMalayalam': ['designationMalayalam', 'DesignationMalayalam', 'Designation (Malayalam)', 'Designation malayalam', 'Post (Malayalam)'],
        'pen': ['pen', 'PEN'],
        'bloodGroup': ['bloodGroup', 'Blood Group', 'bloodgroup'],
        'email': ['email', 'Email', 'Email ID'],
        'phoneNo': ['phoneNo', 'PhoneNo', 'PhoneNumber', 'Phone', 'phone'],
        'status': ['status', 'Status'],
        'photoUrl': ['photoUrl', 'PhotoUrl', 'Photo', 'photo'],
        'officeLocation': ['officeLocation', 'OfficeLocation', 'Office', 'location'],
        'targetOffice': ['targetOffice', 'TargetOffice'],
        'serviceStartDate': ['serviceStartDate', 'ServiceStartDate', 'Period of Service From', 'dateOfJoining', 'service_start_date'],
        'serviceEndDate': ['serviceEndDate', 'ServiceEndDate', 'Period of Service To', 'service_end_date'],
    };

    if (mappings[key]) {
        for (const altKey of mappings[key]) {
            if (data[altKey] !== undefined && data[altKey] !== null) return data[altKey];
        }
    }

    const searchKey = key.toLowerCase();
    const foundKey = Object.keys(data).find(k => k.toLowerCase() === searchKey);
    if (foundKey) return data[foundKey];

    return undefined;
};

const districtsOrder = [
    "Directorate TVM",
    "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", 
    "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", 
    "Wayanad", "Kannur", "Kasaragod",
    "Lab TVM", "Lab EKM", "Lab KKD"
];

const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    const dateObj = toDateOrNull(date);
    if (!dateObj || !isValid(dateObj)) return "";
    return format(dateObj, 'yyyy-MM-dd');
};

export default function StaffForm({ onSubmit, initialData, isSubmitting, onCancel, isViewer = false, allOfficeAddresses, allUsers }: StaffFormProps) {
  const { user } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const formDesignationOptions = useMemo(() => {
    if (user?.role === 'superAdmin') {
        return designationOptions;
    }
    const subOfficeStartIndex = designationOptions.indexOf("Executive Engineer");
    if (subOfficeStartIndex !== -1) {
        return ["Executive Engineer", ...designationOptions.slice(subOfficeStartIndex)];
    }

    return designationOptions;
  }, [user]);

  const formDesignationMalayalamOptions = useMemo(() => {
    if (user?.role === 'superAdmin') {
        return designationMalayalamOptions;
    }
    const subOfficeStartIndex = designationMalayalamOptions.indexOf("എക്സിക്യൂട്ടീവ് എഞ്ചിനീയർ");
     if (subOfficeStartIndex !== -1) {
        return ["എക്സിക്യൂട്ടീവ് എഞ്ചിനീയർ", ...designationMalayalamOptions.slice(subOfficeStartIndex + 1)];
    }
    return designationMalayalamOptions;
  }, [user]);

  const defaultValues = useMemo((): StaffMemberFormData => {
    const rawData = initialData || {};
    
    const normalize = (val: any) => {
        if (val === null || val === undefined) return "";
        return String(val).trim();
    };

    const designationValue = normalize(getField(rawData, 'designation'));
    const designationMalayalamValue = normalize(getField(rawData, 'designationMalayalam'));
    const statusValue = normalize(getField(rawData, 'status')) as StaffStatusType;
    
    const currentTarget = normalize(getField(rawData, 'targetOffice'));
    const currentOffice = normalize(getField(rawData, 'officeLocation') || getField(rawData, 'officeLocationFromPath'));
    let officeLocationValue = currentTarget || currentOffice;
    
    // Normalize and Match Dropdown values for casing compatibility
    const lowerVal = officeLocationValue.toLowerCase().trim();
    if (lowerVal === 'directorate' || lowerVal === 'directorate tvm') {
        officeLocationValue = 'Directorate TVM';
    } else {
        const match = districtsOrder.find(d => d.toLowerCase() === lowerVal);
        if (match) {
            officeLocationValue = match;
        }
    }

    const userForStaff = allUsers.find(u => 
        u.staffId && initialData?.id && 
        String(u.staffId).trim().toLowerCase() === String(initialData.id).trim().toLowerCase()
    );
    const email = normalize(getField(rawData, 'email') || userForStaff?.email);

    const dob = getField(rawData, 'dateOfBirth') ? toDateOrNull(getField(rawData, 'dateOfBirth')) : null;
    const serviceStartDate = getField(rawData, 'serviceStartDate') ? toDateOrNull(getField(rawData, 'serviceStartDate')) : null;
    const serviceEndDate = getField(rawData, 'serviceEndDate') ? toDateOrNull(getField(rawData, 'serviceEndDate')) : null;
    
    return {
        name: normalize(getField(rawData, 'name')),
        nameMalayalam: normalize(getField(rawData, 'nameMalayalam')),
        designation: formDesignationOptions.find(o => o.toLowerCase().trim() === designationValue.toLowerCase()) as any,
        designationMalayalam: formDesignationMalayalamOptions.find(o => o.toLowerCase().trim() === designationMalayalamValue.toLowerCase()) as any,
        pen: normalize(getField(rawData, 'pen')),
        bloodGroup: getField(rawData, 'bloodGroup') || null,
        email,
        dateOfBirth: dob,
        serviceStartDate: serviceStartDate,
        serviceEndDate: serviceEndDate,
        phoneNo: normalize(getField(rawData, 'phoneNo')),
        roles: normalize(getField(rawData, 'roles')),
        photoUrl: normalize(getField(rawData, 'photoUrl')),
        status: staffStatusOptions.find(o => o.toLowerCase().trim() === statusValue.toLowerCase()) as StaffStatusType || 'Active',
        remarks: normalize(getField(rawData, 'remarks')),
        officeLocation: officeLocationValue,
        createUserAccount: false,
    };
  }, [initialData, allUsers, formDesignationOptions, formDesignationMalayalamOptions]);

  const form = useForm<StaffMemberFormData>({
    resolver: zodResolver(StaffMemberFormDataSchema),
    defaultValues
  });
  
  const { watch, control, handleSubmit, reset } = form;
  
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const watchedPhotoUrl = watch("photoUrl");
  const watchedStatus = watch("status");
  
  const userAccountExists = useMemo(() => {
    if (!initialData?.id) return false;
    return allUsers.some(user => 
        String(user.staffId).trim().toLowerCase() === String(initialData.id).trim().toLowerCase()
    );
  }, [initialData, allUsers]);

  const showUserCreation = !isViewer && !userAccountExists;
  
  useEffect(() => {
    const url = watchedPhotoUrl ?? null;
    if (isValidWebUrl(url)) {
      setImagePreview(url);
      setImageLoadError(false);
    } else {
      setImagePreview(null); 
      setImageLoadError(!!(watchedPhotoUrl && watchedPhotoUrl.trim() !== ""));
    }
  }, [watchedPhotoUrl]);

  const handleFormSubmitInternal = (data: StaffMemberFormData) => {
    if (isViewer) return;
    const formattedData = {
        ...data,
        name: formatCase(data.name) ?? data.name,
    };
    onSubmit(formattedData);
  };

  const visibleStatusOptions = useMemo(() => {
    return staffStatusOptions.filter(o => o !== 'Pending Transfer');
  }, []);

  const isTransferring = watchedStatus === 'Transferred' || watchedStatus === 'Pending Transfer';
  
  const sortedOfficeOptions = useMemo(() => {
    return districtsOrder.map(location => ({
        id: location.toLowerCase().replace(/\s+/g, '-'),
        officeLocation: location
    }));
  }, []);


  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(handleFormSubmitInternal)} className="flex flex-col h-full overflow-hidden">
        <ScrollArea className="flex-1 pr-6 -mr-6">
          <div className="space-y-6 pb-4">
            {/* Identity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} value={field.value ?? ''} readOnly={isViewer} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nameMalayalam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name (in Malayalam)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name in Malayalam" {...field} value={field.value || ""} readOnly={isViewer} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={isViewer || isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select designation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {formDesignationOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="designationMalayalam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation (in Malayalam)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={isViewer || isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Malayalam designation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-80">
                        {formDesignationMalayalamOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PEN</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter PEN" {...field} value={field.value ?? ''} readOnly={isViewer} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="bloodGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Group</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === '_clear_' ? null : val)} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                         <SelectItem value="_clear_">-- Clear --</SelectItem>
                        {bloodGroupOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} value={field.value || ""} readOnly={isViewer || userAccountExists} className={cn(userAccountExists && "bg-muted/50")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="phoneNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Enter 10 digit phone number" {...field} value={field.value || ""} readOnly={isViewer} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Service & Essential Details */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <Info className="h-4 w-4" /> Service & Professional Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                    control={form.control}
                    name="serviceStartDate"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Period of Service (From)</FormLabel>
                        <FormControl>
                        <Input type="date" {...field} value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} readOnly={isViewer}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="serviceEndDate"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Period of Service (To)</FormLabel>
                        <FormControl>
                        <Input type="date" {...field} value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} readOnly={isViewer}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                        <Input type="date" {...field} value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} readOnly={isViewer}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={isViewer || isSubmitting}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {visibleStatusOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                            {field.value === 'Pending Transfer' && (
                                <SelectItem value="Pending Transfer">Pending Transfer</SelectItem>
                            )}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
            </div>

            {/* Photo URL & Preview Section */}
            <div className="pt-4 border-t">
              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                    <FormItem className="space-y-2">
                        <FormLabel>Staff Photo</FormLabel>
                        <div className="flex items-start gap-4">
                            <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                              <DialogTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    "relative h-24 w-24 rounded-md border flex items-center justify-center cursor-default bg-white shrink-0",
                                    imagePreview && "cursor-pointer hover:opacity-80 transition-opacity"
                                  )}
                                  onClick={() => imagePreview && setIsImageModalOpen(true)}
                                  disabled={!imagePreview}
                                  aria-label={imagePreview ? "View larger image" : "Image preview"}
                                >
                                  {imagePreview && !imageLoadError ? (
                                    <Image
                                        src={imagePreview}
                                        alt="Staff photo preview"
                                        className="rounded-md object-cover h-full w-full"
                                        width={96}
                                        height={96}
                                        onError={() => {
                                            setImageLoadError(true);
                                        }}
                                    />
                                  ) : (
                                      <div className="h-full w-full bg-muted flex items-center justify-center rounded-md">
                                          {imageLoadError ? (
                                              <Unplug className="h-10 w-10 text-destructive" />
                                          ) : (
                                              <ImageUp className="h-10 w-10 text-muted-foreground" />
                                          )}
                                      </div>
                                  )}
                                  {imagePreview && !imageLoadError && (
                                    <div className="absolute bottom-1 right-1 bg-black/50 p-1 rounded-sm">
                                      <Expand className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                </button>
                              </DialogTrigger>
                               {imagePreview && !imageLoadError && (
                                <DialogContent className="p-2 border-0 bg-transparent shadow-none max-w-[90vw] flex justify-center">
                                  <div className="flex justify-center items-center max-h-[85vh] overflow-hidden">
                                    <Image src={imagePreview} alt="Staff photo enlarged" width={800} height={800} className="max-w-full max-h-full object-contain rounded-md shadow-2xl"/>
                                  </div>
                                </DialogContent>
                              )}
                            </Dialog>

                            <div className="flex-1">
                                <FormControl>
                                    <Input 
                                        placeholder="https://example.com/photo.jpg" 
                                        {...field} 
                                        value={field.value || ""}
                                        readOnly={isViewer}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Enter a direct public URL. Uploading files is not supported.
                                </FormDescription>
                                 {imageLoadError && <p className="text-xs text-destructive mt-1">Invalid or unloadable image URL</p>}
                            </div>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-4 border-t">
              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles/Responsibilities</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Section Clerk, Field Supervisor" className="resize-y min-h-[100px]" {...field} value={field.value || ""} readOnly={isViewer}/>
                    </FormControl>
                    <FormDescription>(Optional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any additional remarks about the staff member." className="resize-y min-h-[100px]" {...field} value={field.value || ""} readOnly={isViewer}/>
                    </FormControl>
                    <FormDescription>(Optional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isTransferring && (
                <div className="pt-4 border-t space-y-4">
                    <FormField
                        control={form.control}
                        name="officeLocation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Transfer to Office</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""} disabled={isViewer || isSubmitting}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select destination office" /></SelectTrigger></FormControl>
                                    <SelectContent className="max-h-80">
                                        {sortedOfficeOptions.map(office => (
                                            <SelectItem key={office.id} value={office.officeLocation}>
                                                {office.officeLocation}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription className="text-xs">
                                    {user?.role === 'superAdmin' 
                                        ? "Select the destination office. Click 'Save Changes' to update the request, or use the 'Approve' button in the table to complete the move." 
                                        : "Select the destination office. This request will be sent to the Super Admin for final approval."
                                    }
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex flex-col sm:flex-row justify-between items-center pt-6 mt-auto gap-4 border-t shrink-0">
          <div className="flex-1 w-full sm:w-auto">
            {showUserCreation ? (
              <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
                <FormField
                  control={form.control}
                  name="createUserAccount"
                  render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                          <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isViewer || isSubmitting}
                          />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                          <FormLabel className="font-semibold text-primary">
                          Create User Account
                          </FormLabel>
                          <FormDescription className="text-xs text-primary/80">
                          This will create a user account with the default password: <strong>123456</strong>
                          </FormDescription>
                      </div>
                      </FormItem>
                  )}
                  />
              </div>
            ) : (
                initialData && userAccountExists && !isViewer && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        <span>User account already exists.</span>
                    </div>
                )
            )}
          </div>
          <div className="flex justify-end space-x-3 w-full sm:w-auto">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            {!isViewer && (
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {initialData?.id ? "Save Changes" : "Add Staff Member"}
                </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
