// src/components/admin/NewUserForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewUserByAdminSchema, type NewUserByAdminFormData, designationOptions, type StaffMember, type Designation } from "@/lib/schemas";
import { useState, useMemo } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Loader2, UserPlus, X } from "lucide-react";


interface NewUserFormProps {
  staffMembers: StaffMember[];
  staffLoading: boolean;
  onSubmit: (data: NewUserByAdminFormData) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export default function NewUserForm({ staffMembers, staffLoading, onSubmit, isSubmitting, onCancel }: NewUserFormProps) {
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);

  const form = useForm<NewUserByAdminFormData>({
    resolver: zodResolver(NewUserByAdminSchema),
    defaultValues: {
      designation: undefined,
      staffId: "",
      email: "",
      password: "",
    },
  });

  const filteredStaff = useMemo(() => {
    if (!selectedDesignation) return [];
    return staffMembers.filter(s => s.designation === selectedDesignation && s.status === 'Active');
  }, [selectedDesignation, staffMembers]);

  const handleFormSubmit = async (data: NewUserByAdminFormData) => {
    await onSubmit(data);
    if (form.formState.isSubmitSuccessful) {
        form.reset();
        setSelectedDesignation(null);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
        <DialogHeader className="p-6 pb-4 shrink-0">
            <DialogTitle>Create New User (from Staff)</DialogTitle>
            <DialogDescription>
                Select a staff member and provide their login details. They will be assigned the {`'viewer'`} role and will need to be approved manually.
            </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full px-6 py-4">
            <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <Select
                        onValueChange={(value: Designation) => {
                          field.onChange(value);
                          setSelectedDesignation(value);
                          form.resetField("staffId");
                        }}
                        value={field.value}
                        disabled={isSubmitting || staffLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a designation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {designationOptions.map(option => (
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
                  name="staffId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name of Staff</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting || staffLoading || !selectedDesignation || filteredStaff.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                                staffLoading ? "Loading staff..." :
                                !selectedDesignation ? "Select designation first" :
                                filteredStaff.length === 0 ? "No active staff found for designation" :
                                "Select a staff member"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredStaff.map(staff => (
                            <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
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
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Create a temporary password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="p-6 pt-4 shrink-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || staffLoading}>
            {isSubmitting || staffLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
