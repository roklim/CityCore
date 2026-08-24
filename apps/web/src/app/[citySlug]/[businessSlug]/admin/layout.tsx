import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BusinessAdminShell } from "../../../../components/business-admin-shell";
import { getBusinessAdminContext } from "../../../../lib/business-admin-server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function BusinessAdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ citySlug: string; businessSlug: string }>;
}) {
  const { citySlug, businessSlug } = await params;
  const { session, business } = await getBusinessAdminContext(citySlug, businessSlug);

  return (
    <BusinessAdminShell
      accessCount={session.auth.accesses.length}
      activeAccess={session.auth.activeAccess}
      business={business}
      userEmail={session.auth.user.email}
    >
      {children}
    </BusinessAdminShell>
  );
}
