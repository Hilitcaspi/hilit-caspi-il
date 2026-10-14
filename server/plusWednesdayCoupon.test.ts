import {beforeEach,describe,expect,it,vi} from "vitest";
const fake=vi.hoisted(()=>({getDb:vi.fn(),select:vi.fn(),pending:[] as any[]}));
vi.mock("./db",()=>({getDb:fake.getDb}));
import{validatePlusWednesdayCoupon}from"./plusWednesdayCoupon";
const now=Date.parse("2026-10-14T18:00:00+03:00");
beforeEach(()=>{vi.resetAllMocks();fake.pending=[];fake.select.mockImplementation(()=>{const c:any={from:()=>c,where:()=>c,innerJoin:()=>c,limit:()=>Promise.resolve(fake.pending.shift()||[])};return c;});fake.getDb.mockResolvedValue({select:fake.select});});
describe("PLUS3 prevalidation is SELECT-only",()=>{
 it("rejects wrong product, missing email or Thursday before querying",async()=>{expect((await validatePlusWednesdayCoupon({product:"database"},now)).valid).toBe(false);expect((await validatePlusWednesdayCoupon({product:"plus"},now)).valid).toBe(false);expect((await validatePlusWednesdayCoupon({product:"plus",email:"synthetic@example.test"},Date.parse("2026-10-15T00:00:00+03:00"))).valid).toBe(false);expect(fake.getDb).not.toHaveBeenCalled();});
 it("validates active paid first-time member without a discount field",async()=>{fake.pending=[[{isPaid:true,isActive:true}],[]];expect(await validatePlusWednesdayCoupon({product:"plus",email:"synthetic@example.test"},now)).toEqual({valid:true,code:"PLUS3"});expect(fake.select).toHaveBeenCalledTimes(2);});
 it("rejects cancelled or previously billed Plus while allowing waitlist",async()=>{for(const member of [{status:"churned"},{lastPaymentAt:now-1000},{billingStatus:"ended"}]){fake.pending=[[{isPaid:true,isActive:true}],[member]];expect((await validatePlusWednesdayCoupon({product:"plus",email:"synthetic@example.test"},now)).valid).toBe(false);}fake.pending=[[{isPaid:true,isActive:true}],[{status:"waitlist",billingStatus:"not_configured"}]];expect((await validatePlusWednesdayCoupon({product:"plus",email:"synthetic@example.test"},now)).valid).toBe(true);});
 it("fails closed for inactive/unpaid DB members and unavailable DB",async()=>{fake.pending=[[{isPaid:true,isActive:false}]];expect((await validatePlusWednesdayCoupon({product:"plus",email:"synthetic@example.test"},now)).valid).toBe(false);fake.getDb.mockResolvedValue(null);expect((await validatePlusWednesdayCoupon({product:"plus",email:"synthetic@example.test"},now)).valid).toBe(false);});
});
