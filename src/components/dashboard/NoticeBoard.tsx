// src/components/dashboard/NoticeBoard.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { StaffMember, Designation } from '@/lib/schemas';
import { isValid, format, startOfMonth, endOfMonth } from 'date-fns';
import { Megaphone, Cake, Gift, PartyPopper, ChevronRight, FileDown, Loader2, CalendarDays } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import download from 'downloadjs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; 
    }
    return hash;
};

const getColorClass = (nameOrEmail: string): string => {
    const colors = [
        "bg-red-200 text-red-800", "bg-orange-200 text-orange-800", "bg-amber-200 text-amber-800",
        "bg-yellow-200 text-yellow-800", "bg-lime-200 text-lime-800", "bg-green-200 text-green-800",
        "bg-emerald-200 text-emerald-800", "bg-teal-200 text-teal-800", "bg-cyan-200 text-cyan-800",
        "bg-sky-200 text-sky-800", "bg-blue-200 text-blue-800", "bg-indigo-200 text-indigo-800",
        "bg-violet-200 text-violet-800", "bg-purple-200 text-purple-800", "bg-fuchsia-200 text-fuchsia-800",
        "bg-pink-200 text-pink-800", "bg-rose-200 text-rose-800"
    ];
    const hash = hashCode(nameOrEmail);
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

const getInitials = (name?: string) => {
  if (!name || name.trim() === '') return 'U';
  return name
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

interface NoticeBoardProps {
  staffMembers: StaffMember[];
}

export default function NoticeBoard({ staffMembers }: NoticeBoardProps) {
  const { toast } = useToast();
  const [selectedBirthday, setSelectedBirthday] = useState<{ name: string, designation?: Designation, photoUrl?: string | null } | null>(null);
  const [isYearListOpen, setIsYearListOpen] = useState(false);
  const [selectedViewMonth, setSelectedViewMonth] = useState<number>(new Date().getMonth());
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const noticeData = useMemo(() => {
    const todaysBirthdays: { name: string, designation?: Designation, photoUrl?: string | null }[] = [];
    const upcomingBirthdaysInMonth: { name: string; designation?: Designation; photoUrl?: string | null; dateOfBirth: Date }[] = [];
    
    const allYearBirthdays: Record<number, { name: string; designation?: Designation; photoUrl?: string | null; dateOfBirth: Date }[]> = {};
    for (let i = 0; i < 12; i++) allYearBirthdays[i] = [];

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    
    const activeStaffWithDob = staffMembers.filter(s => s.status === 'Active' && s.dateOfBirth);

    for (const staff of activeStaffWithDob) {
      const dob = new Date(staff.dateOfBirth!);
      if (isValid(dob)) {
        const dobMonth = dob.getMonth();
        const dobDate = dob.getDate();
        
        const birthdayInfo = { name: staff.name, designation: staff.designation as Designation, photoUrl: staff.photoUrl, dateOfBirth: dob };
        allYearBirthdays[dobMonth].push(birthdayInfo);
        
        if (dobMonth === todayMonth) {
            if (dobDate === todayDate) {
                todaysBirthdays.push({ name: staff.name, designation: staff.designation as Designation, photoUrl: staff.photoUrl });
            } else if (dobDate > todayDate) {
                upcomingBirthdaysInMonth.push(birthdayInfo);
            }
        }
      }
    }

    for (let i = 0; i < 12; i++) {
        allYearBirthdays[i].sort((a, b) => a.dateOfBirth.getDate() - b.dateOfBirth.getDate());
    }
    upcomingBirthdaysInMonth.sort((a, b) => a.dateOfBirth.getDate() - b.dateOfBirth.getDate());

    return {
      todaysBirthdays,
      upcomingBirthdays: upcomingBirthdaysInMonth,
      allYearBirthdays,
      currentMonthCount: allYearBirthdays[todayMonth].length
    };
  }, [staffMembers]);
  
  const enableTodayScrolling = noticeData.todaysBirthdays.length > 2;
  const enableUpcomingScrolling = noticeData.upcomingBirthdays.length > 3;
  const todayBirthdayList = enableTodayScrolling ? [...noticeData.todaysBirthdays, ...noticeData.todaysBirthdays] : noticeData.todaysBirthdays;
  const upcomingBirthdayList = enableUpcomingScrolling ? [...noticeData.upcomingBirthdays, ...noticeData.upcomingBirthdays] : noticeData.upcomingBirthdays;

  const handleDownloadPdf = async () => {
    const monthData = noticeData.allYearBirthdays[selectedViewMonth];
    if (monthData.length === 0) {
      toast({ title: `No birthdays in ${MONTHS[selectedViewMonth]} to export` });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Pre-fetch images
      const images: (any | null)[] = await Promise.all(
        monthData.map(async (staff) => {
          if (!staff.photoUrl) return null;
          try {
            const normalRes = await fetch(staff.photoUrl).catch(() => null);
            if (!normalRes || !normalRes.ok) return null;
            
            const arrayBuffer = await normalRes.arrayBuffer();
            const contentType = normalRes.headers.get('content-type');
            if (contentType?.includes('png')) {
              return await pdfDoc.embedPng(arrayBuffer);
            } else {
              return await pdfDoc.embedJpg(arrayBuffer);
            }
          } catch (e) {
            return null;
          }
        })
      );

      const PAGE_WIDTH = 595.28; // A4
      const PAGE_HEIGHT = 841.89;
      const MARGIN = 40;
      const CARD_WIDTH = (PAGE_WIDTH - (MARGIN * 2) - 15) / 2;
      const CARD_HEIGHT = 65;
      const COL_GAP = 15;
      const ROW_GAP = 10;
      
      let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let y = PAGE_HEIGHT - MARGIN - 40;

      // Header
      page.drawText('GROUND WATER DEPARTMENT', { x: MARGIN, y: PAGE_HEIGHT - MARGIN, size: 14, font: timesRomanBold, color: rgb(0, 0, 0) });
      page.drawText(`Staff Birthday Calendar - ${MONTHS[selectedViewMonth]} ${new Date().getFullYear()}`, { 
        x: MARGIN, 
        y: PAGE_HEIGHT - MARGIN - 18, 
        size: 11, 
        font: timesRoman, 
        color: rgb(0.4, 0.4, 0.4) 
      });

      monthData.forEach((staff, index) => {
        const col = index % 2;
        
        if (col === 0 && index > 0) {
          y -= (CARD_HEIGHT + ROW_GAP);
        }

        if (y < MARGIN + CARD_HEIGHT) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN - 40;
        }

        const x = MARGIN + (col * (CARD_WIDTH + COL_GAP));

        page.drawRectangle({
          x,
          y,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          color: rgb(0.97, 0.98, 1), 
          borderColor: rgb(0.85, 0.88, 0.92),
          borderWidth: 1,
        });

        const avatarSize = 34;
        const avatarX = x + 10;
        const avatarY = y + (CARD_HEIGHT - avatarSize) / 2;
        
        const embeddedImage = images[index];

        if (embeddedImage) {
            page.drawImage(embeddedImage, {
                x: avatarX,
                y: avatarY,
                width: avatarSize,
                height: avatarSize,
            });
            page.drawRectangle({
              x: avatarX,
              y: avatarY,
              width: avatarSize,
              height: avatarSize,
              borderColor: rgb(0.8, 0.85, 0.95),
              borderWidth: 1,
            });
        } else {
            page.drawRectangle({
                x: avatarX,
                y: avatarY,
                width: avatarSize,
                height: avatarSize,
                color: rgb(0.8, 0.85, 1),
                borderColor: rgb(0.7, 0.75, 0.9),
                borderWidth: 1,
            });

            const initials = getInitials(staff.name);
            const initialsWidth = helveticaBold.widthOfTextAtSize(initials, 10);
            page.drawText(initials, {
                x: avatarX + (avatarSize - initialsWidth) / 2,
                y: avatarY + (avatarSize / 2) - 3.5,
                size: 10,
                font: helveticaBold,
                color: rgb(0.2, 0.3, 0.6),
            });
        }

        const textX = avatarX + avatarSize + 10;
        
        page.drawText(staff.name.length > 25 ? staff.name.substring(0, 22) + '...' : staff.name, {
          x: textX,
          y: y + 36,
          size: 9.5,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.1),
        });

        const designation = staff.designation || 'Staff Member';
        page.drawText(designation.length > 30 ? designation.substring(0, 27) + '...' : designation, {
          x: textX,
          y: y + 22,
          size: 8,
          font: helvetica,
          color: rgb(0.4, 0.4, 0.4),
        });

        const dividerX = x + CARD_WIDTH - 45;
        page.drawLine({
          start: { x: dividerX, y: y + 8 },
          end: { x: dividerX, y: y + CARD_HEIGHT - 8 },
          thickness: 1,
          color: rgb(0.9, 0.92, 0.95),
        });

        const day = format(staff.dateOfBirth, 'dd');
        const monthShort = format(staff.dateOfBirth, 'MMM').toUpperCase();
        
        const dayWidth = helveticaBold.widthOfTextAtSize(day, 16);
        page.drawText(day, {
          x: dividerX + (45 - dayWidth) / 2,
          y: y + 30,
          size: 16,
          font: helveticaBold,
          color: rgb(0.2, 0.4, 0.8), 
        });

        const monthShortWidth = helveticaBold.widthOfTextAtSize(monthShort, 8);
        page.drawText(monthShort, {
          x: dividerX + (45 - monthShortWidth) / 2,
          y: y + 18,
          size: 8,
          font: helveticaBold,
          color: rgb(0.5, 0.5, 0.5),
        });
      });

      const pdfBytes = await pdfDoc.save();
      download(pdfBytes, `Staff_Birthdays_${MONTHS[selectedViewMonth]}_${new Date().getFullYear()}.pdf`, 'application/pdf');
      toast({ title: "PDF Generated" });
    } catch (error: any) {
      console.error("PDF generation error:", error);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const currentlyViewedBirthdays = noticeData.allYearBirthdays[selectedViewMonth];

  return (
    <Card className="shadow-lg flex flex-col h-[450px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />Birthday Updates</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 pt-0 min-h-0">
        <Dialog open={!!selectedBirthday} onOpenChange={(isOpen) => !isOpen && setSelectedBirthday(null)}>
          <div className={cn("border rounded-lg p-3 bg-background flex flex-col")}>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Cake className="h-4 w-4 text-pink-500" />Today&apos;s Birthdays ({noticeData.todaysBirthdays.length})</h3>
            <div className={cn("pr-3", enableTodayScrolling ? "h-28 marquee-container-birthdays" : "h-auto")}>
              {todayBirthdayList.length > 0 ? (
                <div className={cn("space-y-3", enableTodayScrolling && "marquee-content-birthdays")}>
                  {todayBirthdayList.map((staff, index) => (
                    <DialogTrigger key={index} asChild>
                      <button onClick={() => setSelectedBirthday(staff)} className="w-full p-2 rounded-md bg-pink-500/10 hover:bg-pink-500/20 transition-colors flex items-center gap-3 text-left">
                        <Avatar className="h-10 w-10 border-2 border-pink-200">
                          <AvatarImage src={staff.photoUrl || undefined} alt={staff.name} />
                          <AvatarFallback className="bg-pink-100 text-pink-700 font-bold">{getInitials(staff.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-pink-700 text-xs -mb-1 flex items-center gap-1.5"><Gift className="h-4 w-4" />Happy Birthday!</p>
                          <p className="font-bold text-sm text-pink-800">{staff.name}</p>
                        </div>
                      </button>
                    </DialogTrigger>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center py-6">
                  <p className="text-sm text-muted-foreground italic">No birthdays today.</p>
                </div>
              )}
            </div>
          </div>
          <DialogContent>
            <div className="p-4 flex flex-col items-center text-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-pink-50 to-indigo-50">
                <PartyPopper className="absolute top-2 left-4 h-6 w-6 text-yellow-400 -rotate-45" />
                <PartyPopper className="absolute top-8 right-6 h-5 w-5 text-blue-400 rotate-12" />
                <PartyPopper className="absolute bottom-6 left-8 h-5 w-5 text-red-400 rotate-6" />
                <PartyPopper className="absolute bottom-2 right-4 h-6 w-6 text-green-400 -rotate-12" />
                <div className="relative z-10 flex flex-col items-center">
                    <Avatar className="h-32 w-32 mb-4 border-2 p-1 border-primary/50 shadow-lg bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-400">
                      <AvatarImage src={selectedBirthday?.photoUrl || undefined} alt={selectedBirthday?.name} />
                      <AvatarFallback className="text-4xl">{getInitials(selectedBirthday?.name)}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-2xl font-bold text-primary">Happy Birthday!</h2>
                    <p className="mt-4 text-foreground">{`Wishing you a fantastic day filled with joy and celebration!`}</p>
                </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isYearListOpen} onOpenChange={setIsYearListOpen}>
          <div className={cn("border rounded-lg p-3 bg-background flex flex-col flex-1 min-h-0")}>
            <DialogTrigger asChild>
              <button 
                className="text-sm font-semibold mb-2 flex items-center justify-between group hover:text-primary transition-colors w-full text-left"
                onClick={() => setIsYearListOpen(true)}
              >
                <span className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-indigo-500" />
                  Staff Birthday Calendar ({noticeData.currentMonthCount})
                </span>
                <span className="text-[10px] font-normal text-muted-foreground group-hover:underline flex items-center gap-0.5">
                  View Year <ChevronRight className="h-3 w-3" />
                </span>
              </button>
            </DialogTrigger>
            <ScrollArea className="flex-1 pr-3 -mr-3">
              <div className={cn("space-y-2", enableUpcomingScrolling && "marquee-container-birthdays")}>
                <div className={cn("space-y-2", enableUpcomingScrolling && "marquee-content-birthdays")}>
                    {upcomingBirthdayList.length > 0 ? (
                        upcomingBirthdayList.map((staff, index) => (
                          <div key={index} className="w-full p-2 rounded-md bg-indigo-500/10 flex items-center gap-3 text-left">
                            <Avatar className="h-10 w-10 border-2 border-indigo-200">
                              <AvatarImage src={staff.photoUrl || undefined} alt={staff.name} />
                              <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{getInitials(staff.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-bold text-sm text-indigo-800">{staff.name}</p>
                              <p className="text-xs text-indigo-700">{staff.designation}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg text-indigo-800">{format(staff.dateOfBirth, 'dd')}</p>
                              <p className="text-xs text-indigo-700 -mt-1">{format(staff.dateOfBirth, 'MMM')}</p>
                            </div>
                          </div>
                        ))
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-sm text-muted-foreground italic text-center py-10">No other birthdays this month.</p>
                        </div>
                    )}
                  </div>
                </div>
            </ScrollArea>
          </div>

          <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="space-y-1 text-center sm:text-left">
                <DialogTitle className="flex items-center justify-center sm:justify-start gap-2 text-xl">
                  <CalendarDays className="h-6 w-6 text-primary" />
                  Staff Birthday Calendar {new Date().getFullYear()}
                </DialogTitle>
                <DialogDescription>
                  View birthdays for any month and download reports.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(selectedViewMonth)} onValueChange={(v) => setSelectedViewMonth(parseInt(v))}>
                    <SelectTrigger className="w-[150px] h-8">
                        <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                        {MONTHS.map((m, idx) => <SelectItem key={idx} value={String(idx)}>{m}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadPdf} 
                    disabled={isGeneratingPdf || currentlyViewedBirthdays.length === 0}
                    className="h-8"
                >
                    {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
                    Download PDF
                </Button>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto min-0 bg-background">
                <div className="p-6">
                  {currentlyViewedBirthdays.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                      {currentlyViewedBirthdays.map((staff, index) => {
                        const avatarColorClass = getColorClass(staff.name);
                        return (
                          <div key={index} className="flex items-center gap-4 p-3 rounded-lg border bg-secondary/10 hover:bg-secondary/20 transition-colors">
                            <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
                              <AvatarImage src={staff.photoUrl || undefined} alt={staff.name} />
                              <AvatarFallback className={cn("font-bold", avatarColorClass)}>{getInitials(staff.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{staff.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{staff.designation || 'Staff Member'}</p>
                            </div>
                            <div className="text-right shrink-0 border-l pl-3 border-primary/10">
                              <p className="font-bold text-lg text-primary leading-tight">{format(staff.dateOfBirth, 'dd')}</p>
                              <p className="text-[10px] uppercase font-semibold text-muted-foreground -mt-1">{format(staff.dateOfBirth, 'MMM')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <CalendarDays className="h-12 w-12 opacity-20 mb-4" />
                      <p className="italic">No birthdays recorded for {MONTHS[selectedViewMonth]}.</p>
                    </div>
                  )}
                </div>
            </div>
            <DialogFooter className="p-4 border-t shrink-0">
                <DialogClose asChild>
                    <Button variant="secondary">Close</Button>
                </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
