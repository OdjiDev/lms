-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "serial" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_enrollmentId_key" ON "certificates"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_serial_key" ON "certificates"("serial");

-- CreateIndex
CREATE INDEX "certificates_organizationId_issuedAt_idx" ON "certificates"("organizationId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_courseId_userId_key" ON "certificates"("courseId", "userId");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
