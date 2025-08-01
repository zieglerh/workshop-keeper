import {UseFormReturn, FieldValues} from "react-hook-form";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";

interface PurchaseInfoFieldsProps {
    form: UseFormReturn,
}

export default function PurchaseInfoFields({form}: PurchaseInfoFieldsProps) {
    const isPurchasable = form.watch("isPurchasable");

    // Calculate price per unit when total cost or stockQuantity changes
    const calculatePricePerUnit = () => {
        const cost = form.getValues('purchasePrice') || 0;
        const qty = form.getValues('stockQuantity') || 1;
        if (qty > 0) {
            const pricePerUnit = cost / qty;
            form.setValue('pricePerUnit', parseFloat(pricePerUnit.toFixed(2)));
        }
    };

    // Update calculations when values change
    const handlePurchasePriceChange = (value: string) => {
        form.setValue('purchasePrice', parseFloat(value));
        calculatePricePerUnit();
    };

    const handleStockQuantityChange = (value: string) => {
        form.setValue('stockQuantity', parseFloat(value));
        calculatePricePerUnit();
    };

    const handlePurchasableChange = (checked: boolean) => {
        form.setValue("isPurchasable", checked);
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="purchasePrice">Price (€)</Label>
                    <Input
                        id="purchasePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register("purchasePrice", {
                            valueAsNumber: true,
                        })}
                        onChange={(e) => handlePurchasePriceChange(e.target.value)}
                        placeholder="0.00"
                        className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        What you paid in total for this purchase
                    </p>
                    {form.formState.errors.purchasePrice && (
                        <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.purchasePrice.message}
                        </p>
                    )}
                </div>

                <div>
                    <Label htmlFor="stockQuantity">Quantity</Label>
                    <Input
                        id="stockQuantity"
                        type="number"
                        min="1"
                        {...form.register("stockQuantity", {
                            valueAsNumber: true,
                        })}
                        onChange={(e) => handleStockQuantityChange(e.target.value)}
                        placeholder="1"
                        className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        How many units you purchased
                    </p>
                    {form.formState.errors.stockQuantity && (
                        <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.stockQuantity.message}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center space-x-2 mt-6">
                <Checkbox
                    id="purchasable"
                    checked={isPurchasable}
                    onCheckedChange={handlePurchasableChange}
                />
                <Label htmlFor="purchasable" className="text-sm">
                    Mark as purchasable item
                </Label>
            </div>

            {isPurchasable && (
                <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900">Purchase Information</h4>
                    <div className="">
                        <div>
                            <Label htmlFor="pricePerUnit">Price per Unit (€)</Label>
                            <Input
                                id="pricePerUnit"
                                type="number"
                                step="0.01"
                                min="0"
                                {...form.register("pricePerUnit", {
                                    valueAsNumber: true,
                                })}
                                placeholder="0.00"
                                className="mt-1 bg-gray-100"
                                readOnly
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Automatically calculated from total cost ÷ quantity
                            </p>
                            {form.formState.errors.pricePerUnit && (
                                <p className="text-sm text-red-600 mt-1">
                                    {form.formState.errors.pricePerUnit.message}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
