-- DropForeignKey
ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_customerId_fkey";

-- CreateTable
CREATE TABLE "CustomerCoupon" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,
    "timesCouponUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomerCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerCoupon_customerId_couponId_key" ON "CustomerCoupon"("customerId", "couponId");

-- AddForeignKey
ALTER TABLE "CustomerCoupon" ADD CONSTRAINT "CustomerCoupon_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCoupon" ADD CONSTRAINT "CustomerCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
