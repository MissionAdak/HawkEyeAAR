const ih={_meta:{notional:!0,disclaimer:"SYNTHETIC TRAINING AID | NOTIONAL PARAMETERS | NOT A CERTIFICATION",version:"1.1.0"},droneClasses:{RECON_QUAD:{speedMps:15,valueInr:4e4,rcsM2:.01,defaultClass:"HOSTILE_ISR"},FPV_ATTACK:{speedMps:40,valueInr:1e5,rcsM2:.01,defaultClass:"HOSTILE_ATTACK"},SWARM_ELEMENT:{speedMps:45,valueInr:5e4,rcsM2:.01,defaultClass:"SWARM_ELEMENT"},LOITERING_MUNITION:{speedMps:50,valueInr:1e6,rcsM2:.05,defaultClass:"HOSTILE_ATTACK"},CIVIL_UAS:{speedMps:10,valueInr:null,rcsM2:.02,defaultClass:"CIVIL_UAS"},BIRD:{speedMps:6,valueInr:null,rcsM2:.003,defaultClass:"BIRD"},FRIENDLY_UAS:{speedMps:20,valueInr:null,rcsM2:.05,defaultClass:"FRIENDLY"}},effectors:{RF_SOFTKILL:{id:"RF_SOFTKILL",name:"RF Soft-Kill / GNSS Denial",costInr:100,pk0:.8,pk0RfSilent:.1,envelopeMinM:200,envelopeMaxM:2e3,we:.1,debrisRadiusM:0,tier:"T1_NON_KINETIC",keyHint:"F",holdTimeMs:0},LASER:{id:"LASER",name:"Directed Energy (Laser)",costInr:500,pk0:.7,pk0RfSilent:.7,envelopeMinM:200,envelopeMaxM:1500,we:.1,debrisRadiusM:0,tier:"T1_NON_KINETIC",keyHint:"F",holdTimeMs:0},GUN:{id:"GUN",name:"Gun Burst (12.7/40mm)",costInr:2e4,pk0:.6,pk0Swarm:.35,pk0RfSilent:.6,envelopeMinM:100,envelopeMaxM:2e3,we:.6,debrisRadiusM:150,tier:"T2_KINETIC",keyHint:"F",holdTimeMs:0},INTERCEPTOR:{id:"INTERCEPTOR",name:"Interceptor Drone",costInr:2e5,pk0:.8,pk0RfSilent:.8,envelopeMinM:500,envelopeMaxM:4e3,we:.3,debrisRadiusM:100,tier:"T2_KINETIC",keyHint:"F",holdTimeMs:0},MISSILE:{id:"MISSILE",name:"SAM / MANPADS Missile",costInr:3e6,pk0:.9,pk0RfSilent:.9,envelopeMinM:1e3,envelopeMaxM:5e3,we:.9,debrisRadiusM:400,tier:"T3_HEAVY",keyHint:"F",holdTimeMs:500}},thresholds:{qMin:.6,rMinM:500,cerUnfavourableThreshold:10,radarMaxRangeM:5e3,eoirMaxRangeDayM:2500,eoirMaxRangeNightM:1750,rfMaxRangeM:4e3,radarSweepPeriodMs:2e3,radarRpm:30,antennaHeightM:15},zones:{URBAN:{defaultHeightM:40,defaultShadowM:800,defaultRho:.8},RIDGE:{defaultHeightM:80,defaultShadowM:1200,defaultRho:0},FOREST:{defaultHeightM:25,defaultShadowM:300,defaultRho:0}},scoringWeights:{hostile:{d:.25,c:.2,g:.35,r:.2},nonHostile:{c:.5,g:.25,r:.25},threatWeights:{HOSTILE_ATTACK:1,HOSTILE_ISR:.6,SWARM_ELEMENT:.4,CIVIL_UAS:.3,BIRD:.3,FRIENDLY:.3},penalties:{leakerSessionDeduction:20,criticalEventDeduction:25,roeViolationDeduction:20}},classificationMatrix:{HOSTILE_ATTACK:{HOSTILE_ATTACK:100,HOSTILE_ISR:60,SWARM_ELEMENT:60,CIVIL_UAS:0,BIRD:0,FRIENDLY:0,UNKNOWN_EVIDENCE_INSUFFICIENT:25},HOSTILE_ISR:{HOSTILE_ATTACK:60,HOSTILE_ISR:100,SWARM_ELEMENT:60,CIVIL_UAS:0,BIRD:0,FRIENDLY:0,UNKNOWN_EVIDENCE_INSUFFICIENT:25},SWARM_ELEMENT:{HOSTILE_ATTACK:60,HOSTILE_ISR:60,SWARM_ELEMENT:100,CIVIL_UAS:0,BIRD:0,FRIENDLY:0,UNKNOWN_EVIDENCE_INSUFFICIENT:25},CIVIL_UAS:{HOSTILE_ATTACK:20,HOSTILE_ISR:20,SWARM_ELEMENT:20,CIVIL_UAS:100,BIRD:50,FRIENDLY:30,UNKNOWN_EVIDENCE_INSUFFICIENT:40},BIRD:{HOSTILE_ATTACK:20,HOSTILE_ISR:20,SWARM_ELEMENT:20,CIVIL_UAS:50,BIRD:100,FRIENDLY:30,UNKNOWN_EVIDENCE_INSUFFICIENT:40},FRIENDLY:{HOSTILE_ATTACK:20,HOSTILE_ISR:20,SWARM_ELEMENT:20,CIVIL_UAS:30,BIRD:30,FRIENDLY:100,UNKNOWN_EVIDENCE_INSUFFICIENT:40}},chaos:{FOG:{eoirRangeMultiplier:.25,laserPkMultiplier:.5,minDurationMs:12e3,maxDurationMs:25e3},JAMMING:{rfFunctional:!1,softKillPkMultiplier:0,minDurationMs:1e4,maxDurationMs:2e4},RAIN:{aEnv:.6,falsePlotsMin:1,falsePlotsMax:3,minDurationMs:15e3,maxDurationMs:3e4},RADAR_DROPOUT:{aEnv:0,minDurationMs:3e3,maxDurationMs:6e3}}};var at;(function(i){i.assertEqual=r=>{};function e(r){}i.assertIs=e;function t(r){throw new Error}i.assertNever=t,i.arrayToEnum=r=>{const s={};for(const a of r)s[a]=a;return s},i.getValidEnumValues=r=>{const s=i.objectKeys(r).filter(o=>typeof r[r[o]]!="number"),a={};for(const o of s)a[o]=r[o];return i.objectValues(a)},i.objectValues=r=>i.objectKeys(r).map(function(s){return r[s]}),i.objectKeys=typeof Object.keys=="function"?r=>Object.keys(r):r=>{const s=[];for(const a in r)Object.prototype.hasOwnProperty.call(r,a)&&s.push(a);return s},i.find=(r,s)=>{for(const a of r)if(s(a))return a},i.isInteger=typeof Number.isInteger=="function"?r=>Number.isInteger(r):r=>typeof r=="number"&&Number.isFinite(r)&&Math.floor(r)===r;function n(r,s=" | "){return r.map(a=>typeof a=="string"?`'${a}'`:a).join(s)}i.joinValues=n,i.jsonStringifyReplacer=(r,s)=>typeof s=="bigint"?s.toString():s})(at||(at={}));var fc;(function(i){i.mergeShapes=(e,t)=>({...e,...t})})(fc||(fc={}));const Se=at.arrayToEnum(["string","nan","number","integer","float","boolean","date","bigint","symbol","function","undefined","null","array","object","unknown","promise","void","never","map","set"]),Yn=i=>{switch(typeof i){case"undefined":return Se.undefined;case"string":return Se.string;case"number":return Number.isNaN(i)?Se.nan:Se.number;case"boolean":return Se.boolean;case"function":return Se.function;case"bigint":return Se.bigint;case"symbol":return Se.symbol;case"object":return Array.isArray(i)?Se.array:i===null?Se.null:i.then&&typeof i.then=="function"&&i.catch&&typeof i.catch=="function"?Se.promise:typeof Map<"u"&&i instanceof Map?Se.map:typeof Set<"u"&&i instanceof Set?Se.set:typeof Date<"u"&&i instanceof Date?Se.date:Se.object;default:return Se.unknown}},re=at.arrayToEnum(["invalid_type","invalid_literal","custom","invalid_union","invalid_union_discriminator","invalid_enum_value","unrecognized_keys","invalid_arguments","invalid_return_type","invalid_date","invalid_string","too_small","too_big","invalid_intersection_types","not_multiple_of","not_finite"]);class Nn extends Error{get errors(){return this.issues}constructor(e){super(),this.issues=[],this.addIssue=n=>{this.issues=[...this.issues,n]},this.addIssues=(n=[])=>{this.issues=[...this.issues,...n]};const t=new.target.prototype;Object.setPrototypeOf?Object.setPrototypeOf(this,t):this.__proto__=t,this.name="ZodError",this.issues=e}format(e){const t=e||function(s){return s.message},n={_errors:[]},r=s=>{for(const a of s.issues)if(a.code==="invalid_union")a.unionErrors.map(r);else if(a.code==="invalid_return_type")r(a.returnTypeError);else if(a.code==="invalid_arguments")r(a.argumentsError);else if(a.path.length===0)n._errors.push(t(a));else{let o=n,c=0;for(;c<a.path.length;){const l=a.path[c];c===a.path.length-1?(o[l]=o[l]||{_errors:[]},o[l]._errors.push(t(a))):o[l]=o[l]||{_errors:[]},o=o[l],c++}}};return r(this),n}static assert(e){if(!(e instanceof Nn))throw new Error(`Not a ZodError: ${e}`)}toString(){return this.message}get message(){return JSON.stringify(this.issues,at.jsonStringifyReplacer,2)}get isEmpty(){return this.issues.length===0}flatten(e=t=>t.message){const t={},n=[];for(const r of this.issues)if(r.path.length>0){const s=r.path[0];t[s]=t[s]||[],t[s].push(e(r))}else n.push(e(r));return{formErrors:n,fieldErrors:t}}get formErrors(){return this.flatten()}}Nn.create=i=>new Nn(i);const za=(i,e)=>{let t;switch(i.code){case re.invalid_type:i.received===Se.undefined?t="Required":t=`Expected ${i.expected}, received ${i.received}`;break;case re.invalid_literal:t=`Invalid literal value, expected ${JSON.stringify(i.expected,at.jsonStringifyReplacer)}`;break;case re.unrecognized_keys:t=`Unrecognized key(s) in object: ${at.joinValues(i.keys,", ")}`;break;case re.invalid_union:t="Invalid input";break;case re.invalid_union_discriminator:t=`Invalid discriminator value. Expected ${at.joinValues(i.options)}`;break;case re.invalid_enum_value:t=`Invalid enum value. Expected ${at.joinValues(i.options)}, received '${i.received}'`;break;case re.invalid_arguments:t="Invalid function arguments";break;case re.invalid_return_type:t="Invalid function return type";break;case re.invalid_date:t="Invalid date";break;case re.invalid_string:typeof i.validation=="object"?"includes"in i.validation?(t=`Invalid input: must include "${i.validation.includes}"`,typeof i.validation.position=="number"&&(t=`${t} at one or more positions greater than or equal to ${i.validation.position}`)):"startsWith"in i.validation?t=`Invalid input: must start with "${i.validation.startsWith}"`:"endsWith"in i.validation?t=`Invalid input: must end with "${i.validation.endsWith}"`:at.assertNever(i.validation):i.validation!=="regex"?t=`Invalid ${i.validation}`:t="Invalid";break;case re.too_small:i.type==="array"?t=`Array must contain ${i.exact?"exactly":i.inclusive?"at least":"more than"} ${i.minimum} element(s)`:i.type==="string"?t=`String must contain ${i.exact?"exactly":i.inclusive?"at least":"over"} ${i.minimum} character(s)`:i.type==="number"?t=`Number must be ${i.exact?"exactly equal to ":i.inclusive?"greater than or equal to ":"greater than "}${i.minimum}`:i.type==="bigint"?t=`Number must be ${i.exact?"exactly equal to ":i.inclusive?"greater than or equal to ":"greater than "}${i.minimum}`:i.type==="date"?t=`Date must be ${i.exact?"exactly equal to ":i.inclusive?"greater than or equal to ":"greater than "}${new Date(Number(i.minimum))}`:t="Invalid input";break;case re.too_big:i.type==="array"?t=`Array must contain ${i.exact?"exactly":i.inclusive?"at most":"less than"} ${i.maximum} element(s)`:i.type==="string"?t=`String must contain ${i.exact?"exactly":i.inclusive?"at most":"under"} ${i.maximum} character(s)`:i.type==="number"?t=`Number must be ${i.exact?"exactly":i.inclusive?"less than or equal to":"less than"} ${i.maximum}`:i.type==="bigint"?t=`BigInt must be ${i.exact?"exactly":i.inclusive?"less than or equal to":"less than"} ${i.maximum}`:i.type==="date"?t=`Date must be ${i.exact?"exactly":i.inclusive?"smaller than or equal to":"smaller than"} ${new Date(Number(i.maximum))}`:t="Invalid input";break;case re.custom:t="Invalid input";break;case re.invalid_intersection_types:t="Intersection results could not be merged";break;case re.not_multiple_of:t=`Number must be a multiple of ${i.multipleOf}`;break;case re.not_finite:t="Number must be finite";break;default:t=e.defaultError,at.assertNever(i)}return{message:t}};let rh=za;function sh(){return rh}const ah=i=>{const{data:e,path:t,errorMaps:n,issueData:r}=i,s=[...t,...r.path||[]],a={...r,path:s};if(r.message!==void 0)return{...r,path:s,message:r.message};let o="";const c=n.filter(l=>!!l).slice().reverse();for(const l of c)o=l(a,{data:e,defaultError:o}).message;return{...r,path:s,message:o}};function pe(i,e){const t=sh(),n=ah({issueData:e,data:i.data,path:i.path,errorMaps:[i.common.contextualErrorMap,i.schemaErrorMap,t,t===za?void 0:za].filter(r=>!!r)});i.common.issues.push(n)}class Wt{constructor(){this.value="valid"}dirty(){this.value==="valid"&&(this.value="dirty")}abort(){this.value!=="aborted"&&(this.value="aborted")}static mergeArray(e,t){const n=[];for(const r of t){if(r.status==="aborted")return ze;r.status==="dirty"&&e.dirty(),n.push(r.value)}return{status:e.value,value:n}}static async mergeObjectAsync(e,t){const n=[];for(const r of t){const s=await r.key,a=await r.value;n.push({key:s,value:a})}return Wt.mergeObjectSync(e,n)}static mergeObjectSync(e,t){const n={};for(const r of t){const{key:s,value:a}=r;if(s.status==="aborted"||a.status==="aborted")return ze;s.status==="dirty"&&e.dirty(),a.status==="dirty"&&e.dirty(),s.value!=="__proto__"&&(typeof a.value<"u"||r.alwaysSet)&&(n[s.value]=a.value)}return{status:e.value,value:n}}}const ze=Object.freeze({status:"aborted"}),yr=i=>({status:"dirty",value:i}),an=i=>({status:"valid",value:i}),pc=i=>i.status==="aborted",mc=i=>i.status==="dirty",$i=i=>i.status==="valid",Rs=i=>typeof Promise<"u"&&i instanceof Promise;var we;(function(i){i.errToObj=e=>typeof e=="string"?{message:e}:e||{},i.toString=e=>typeof e=="string"?e:e?.message})(we||(we={}));class yn{constructor(e,t,n,r){this._cachedPath=[],this.parent=e,this.data=t,this._path=n,this._key=r}get path(){return this._cachedPath.length||(Array.isArray(this._key)?this._cachedPath.push(...this._path,...this._key):this._cachedPath.push(...this._path,this._key)),this._cachedPath}}const gc=(i,e)=>{if($i(e))return{success:!0,data:e.value};if(!i.common.issues.length)throw new Error("Validation failed but no issues detected.");return{success:!1,get error(){if(this._error)return this._error;const t=new Nn(i.common.issues);return this._error=t,this._error}}};function qe(i){if(!i)return{};const{errorMap:e,invalid_type_error:t,required_error:n,description:r}=i;if(e&&(t||n))throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);return e?{errorMap:e,description:r}:{errorMap:(a,o)=>{const{message:c}=i;return a.code==="invalid_enum_value"?{message:c??o.defaultError}:typeof o.data>"u"?{message:c??n??o.defaultError}:a.code!=="invalid_type"?{message:o.defaultError}:{message:c??t??o.defaultError}},description:r}}class Je{get description(){return this._def.description}_getType(e){return Yn(e.data)}_getOrReturnCtx(e,t){return t||{common:e.parent.common,data:e.data,parsedType:Yn(e.data),schemaErrorMap:this._def.errorMap,path:e.path,parent:e.parent}}_processInputParams(e){return{status:new Wt,ctx:{common:e.parent.common,data:e.data,parsedType:Yn(e.data),schemaErrorMap:this._def.errorMap,path:e.path,parent:e.parent}}}_parseSync(e){const t=this._parse(e);if(Rs(t))throw new Error("Synchronous parse encountered promise.");return t}_parseAsync(e){const t=this._parse(e);return Promise.resolve(t)}parse(e,t){const n=this.safeParse(e,t);if(n.success)return n.data;throw n.error}safeParse(e,t){const n={common:{issues:[],async:t?.async??!1,contextualErrorMap:t?.errorMap},path:t?.path||[],schemaErrorMap:this._def.errorMap,parent:null,data:e,parsedType:Yn(e)},r=this._parseSync({data:e,path:n.path,parent:n});return gc(n,r)}"~validate"(e){const t={common:{issues:[],async:!!this["~standard"].async},path:[],schemaErrorMap:this._def.errorMap,parent:null,data:e,parsedType:Yn(e)};if(!this["~standard"].async)try{const n=this._parseSync({data:e,path:[],parent:t});return $i(n)?{value:n.value}:{issues:t.common.issues}}catch(n){n?.message?.toLowerCase()?.includes("encountered")&&(this["~standard"].async=!0),t.common={issues:[],async:!0}}return this._parseAsync({data:e,path:[],parent:t}).then(n=>$i(n)?{value:n.value}:{issues:t.common.issues})}async parseAsync(e,t){const n=await this.safeParseAsync(e,t);if(n.success)return n.data;throw n.error}async safeParseAsync(e,t){const n={common:{issues:[],contextualErrorMap:t?.errorMap,async:!0},path:t?.path||[],schemaErrorMap:this._def.errorMap,parent:null,data:e,parsedType:Yn(e)},r=this._parse({data:e,path:n.path,parent:n}),s=await(Rs(r)?r:Promise.resolve(r));return gc(n,s)}refine(e,t){const n=r=>typeof t=="string"||typeof t>"u"?{message:t}:typeof t=="function"?t(r):t;return this._refinement((r,s)=>{const a=e(r),o=()=>s.addIssue({code:re.custom,...n(r)});return typeof Promise<"u"&&a instanceof Promise?a.then(c=>c?!0:(o(),!1)):a?!0:(o(),!1)})}refinement(e,t){return this._refinement((n,r)=>e(n)?!0:(r.addIssue(typeof t=="function"?t(n,r):t),!1))}_refinement(e){return new Ji({schema:this,typeName:Oe.ZodEffects,effect:{type:"refinement",refinement:e}})}superRefine(e){return this._refinement(e)}constructor(e){this.spa=this.safeParseAsync,this._def=e,this.parse=this.parse.bind(this),this.safeParse=this.safeParse.bind(this),this.parseAsync=this.parseAsync.bind(this),this.safeParseAsync=this.safeParseAsync.bind(this),this.spa=this.spa.bind(this),this.refine=this.refine.bind(this),this.refinement=this.refinement.bind(this),this.superRefine=this.superRefine.bind(this),this.optional=this.optional.bind(this),this.nullable=this.nullable.bind(this),this.nullish=this.nullish.bind(this),this.array=this.array.bind(this),this.promise=this.promise.bind(this),this.or=this.or.bind(this),this.and=this.and.bind(this),this.transform=this.transform.bind(this),this.brand=this.brand.bind(this),this.default=this.default.bind(this),this.catch=this.catch.bind(this),this.describe=this.describe.bind(this),this.pipe=this.pipe.bind(this),this.readonly=this.readonly.bind(this),this.isNullable=this.isNullable.bind(this),this.isOptional=this.isOptional.bind(this),this["~standard"]={version:1,vendor:"zod",validate:t=>this["~validate"](t)}}optional(){return $n.create(this,this._def)}nullable(){return Qi.create(this,this._def)}nullish(){return this.nullable().optional()}array(){return vn.create(this)}promise(){return Ds.create(this,this._def)}or(e){return Ps.create([this,e],this._def)}and(e){return Ls.create(this,e,this._def)}transform(e){return new Ji({...qe(this._def),schema:this,typeName:Oe.ZodEffects,effect:{type:"transform",transform:e}})}default(e){const t=typeof e=="function"?e:()=>e;return new Wa({...qe(this._def),innerType:this,defaultValue:t,typeName:Oe.ZodDefault})}brand(){return new Ch({typeName:Oe.ZodBranded,type:this,...qe(this._def)})}catch(e){const t=typeof e=="function"?e:()=>e;return new Xa({...qe(this._def),innerType:this,catchValue:t,typeName:Oe.ZodCatch})}describe(e){const t=this.constructor;return new t({...this._def,description:e})}pipe(e){return Vo.create(this,e)}readonly(){return Ya.create(this)}isOptional(){return this.safeParse(void 0).success}isNullable(){return this.safeParse(null).success}}const oh=/^c[^\s-]{8,}$/i,ch=/^[0-9a-z]+$/,lh=/^[0-9A-HJKMNP-TV-Z]{26}$/i,uh=/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,hh=/^[a-z0-9_-]{21}$/i,dh=/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,fh=/^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,ph=/^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i,mh="^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";let js;const gh=/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,_h=/^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,vh=/^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,xh=/^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,Mh=/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,yh=/^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,zl="((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))",Sh=new RegExp(`^${zl}$`);function Gl(i){let e="[0-5]\\d";i.precision?e=`${e}\\.\\d{${i.precision}}`:i.precision==null&&(e=`${e}(\\.\\d+)?`);const t=i.precision?"+":"?";return`([01]\\d|2[0-3]):[0-5]\\d(:${e})${t}`}function Eh(i){return new RegExp(`^${Gl(i)}$`)}function Th(i){let e=`${zl}T${Gl(i)}`;const t=[];return t.push(i.local?"Z?":"Z"),i.offset&&t.push("([+-]\\d{2}:?\\d{2})"),e=`${e}(${t.join("|")})`,new RegExp(`^${e}$`)}function bh(i,e){return!!((e==="v4"||!e)&&gh.test(i)||(e==="v6"||!e)&&vh.test(i))}function Ah(i,e){if(!dh.test(i))return!1;try{const[t]=i.split(".");if(!t)return!1;const n=t.replace(/-/g,"+").replace(/_/g,"/").padEnd(t.length+(4-t.length%4)%4,"="),r=JSON.parse(atob(n));return!(typeof r!="object"||r===null||"typ"in r&&r?.typ!=="JWT"||!r.alg||e&&r.alg!==e)}catch{return!1}}function wh(i,e){return!!((e==="v4"||!e)&&_h.test(i)||(e==="v6"||!e)&&xh.test(i))}class Pn extends Je{_parse(e){if(this._def.coerce&&(e.data=String(e.data)),this._getType(e)!==Se.string){const s=this._getOrReturnCtx(e);return pe(s,{code:re.invalid_type,expected:Se.string,received:s.parsedType}),ze}const n=new Wt;let r;for(const s of this._def.checks)if(s.kind==="min")e.data.length<s.value&&(r=this._getOrReturnCtx(e,r),pe(r,{code:re.too_small,minimum:s.value,type:"string",inclusive:!0,exact:!1,message:s.message}),n.dirty());else if(s.kind==="max")e.data.length>s.value&&(r=this._getOrReturnCtx(e,r),pe(r,{code:re.too_big,maximum:s.value,type:"string",inclusive:!0,exact:!1,message:s.message}),n.dirty());else if(s.kind==="length"){const a=e.data.length>s.value,o=e.data.length<s.value;(a||o)&&(r=this._getOrReturnCtx(e,r),a?pe(r,{code:re.too_big,maximum:s.value,type:"string",inclusive:!0,exact:!0,message:s.message}):o&&pe(r,{code:re.too_small,minimum:s.value,type:"string",inclusive:!0,exact:!0,message:s.message}),n.dirty())}else if(s.kind==="email")ph.test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"email",code:re.invalid_string,message:s.message}),n.dirty());else if(s.kind==="emoji")js||(js=new RegExp(mh,"u")),js.test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"emoji",code:re.invalid_string,message:s.message}),n.dirty());else if(s.kind==="uuid")uh.test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"uuid",code:re.invalid_string,message:s.message}),n.dirty());else if(s.kind==="nanoid")hh.test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"nanoid",code:re.invalid_string,message:s.message}),n.dirty());else if(s.kind==="cuid")oh.test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"cuid",code:re.invalid_string,message:s.message}),n.dirty());else if(s.kind==="cuid2")ch.test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"cuid2",code:re.invalid_string,message:s.message}),n.dirty());else if(s.kind==="ulid")lh.test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"ulid",code:re.invalid_string,message:s.message}),n.dirty());else if(s.kind==="url")try{new URL(e.data)}catch{r=this._getOrReturnCtx(e,r),pe(r,{validation:"url",code:re.invalid_string,message:s.message}),n.dirty()}else s.kind==="regex"?(s.regex.lastIndex=0,s.regex.test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"regex",code:re.invalid_string,message:s.message}),n.dirty())):s.kind==="trim"?e.data=e.data.trim():s.kind==="includes"?e.data.includes(s.value,s.position)||(r=this._getOrReturnCtx(e,r),pe(r,{code:re.invalid_string,validation:{includes:s.value,position:s.position},message:s.message}),n.dirty()):s.kind==="toLowerCase"?e.data=e.data.toLowerCase():s.kind==="toUpperCase"?e.data=e.data.toUpperCase():s.kind==="startsWith"?e.data.startsWith(s.value)||(r=this._getOrReturnCtx(e,r),pe(r,{code:re.invalid_string,validation:{startsWith:s.value},message:s.message}),n.dirty()):s.kind==="endsWith"?e.data.endsWith(s.value)||(r=this._getOrReturnCtx(e,r),pe(r,{code:re.invalid_string,validation:{endsWith:s.value},message:s.message}),n.dirty()):s.kind==="datetime"?Th(s).test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{code:re.invalid_string,validation:"datetime",message:s.message}),n.dirty()):s.kind==="date"?Sh.test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{code:re.invalid_string,validation:"date",message:s.message}),n.dirty()):s.kind==="time"?Eh(s).test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{code:re.invalid_string,validation:"time",message:s.message}),n.dirty()):s.kind==="duration"?fh.test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"duration",code:re.invalid_string,message:s.message}),n.dirty()):s.kind==="ip"?bh(e.data,s.version)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"ip",code:re.invalid_string,message:s.message}),n.dirty()):s.kind==="jwt"?Ah(e.data,s.alg)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"jwt",code:re.invalid_string,message:s.message}),n.dirty()):s.kind==="cidr"?wh(e.data,s.version)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"cidr",code:re.invalid_string,message:s.message}),n.dirty()):s.kind==="base64"?Mh.test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"base64",code:re.invalid_string,message:s.message}),n.dirty()):s.kind==="base64url"?yh.test(e.data)||(r=this._getOrReturnCtx(e,r),pe(r,{validation:"base64url",code:re.invalid_string,message:s.message}),n.dirty()):at.assertNever(s);return{status:n.value,value:e.data}}_regex(e,t,n){return this.refinement(r=>e.test(r),{validation:t,code:re.invalid_string,...we.errToObj(n)})}_addCheck(e){return new Pn({...this._def,checks:[...this._def.checks,e]})}email(e){return this._addCheck({kind:"email",...we.errToObj(e)})}url(e){return this._addCheck({kind:"url",...we.errToObj(e)})}emoji(e){return this._addCheck({kind:"emoji",...we.errToObj(e)})}uuid(e){return this._addCheck({kind:"uuid",...we.errToObj(e)})}nanoid(e){return this._addCheck({kind:"nanoid",...we.errToObj(e)})}cuid(e){return this._addCheck({kind:"cuid",...we.errToObj(e)})}cuid2(e){return this._addCheck({kind:"cuid2",...we.errToObj(e)})}ulid(e){return this._addCheck({kind:"ulid",...we.errToObj(e)})}base64(e){return this._addCheck({kind:"base64",...we.errToObj(e)})}base64url(e){return this._addCheck({kind:"base64url",...we.errToObj(e)})}jwt(e){return this._addCheck({kind:"jwt",...we.errToObj(e)})}ip(e){return this._addCheck({kind:"ip",...we.errToObj(e)})}cidr(e){return this._addCheck({kind:"cidr",...we.errToObj(e)})}datetime(e){return typeof e=="string"?this._addCheck({kind:"datetime",precision:null,offset:!1,local:!1,message:e}):this._addCheck({kind:"datetime",precision:typeof e?.precision>"u"?null:e?.precision,offset:e?.offset??!1,local:e?.local??!1,...we.errToObj(e?.message)})}date(e){return this._addCheck({kind:"date",message:e})}time(e){return typeof e=="string"?this._addCheck({kind:"time",precision:null,message:e}):this._addCheck({kind:"time",precision:typeof e?.precision>"u"?null:e?.precision,...we.errToObj(e?.message)})}duration(e){return this._addCheck({kind:"duration",...we.errToObj(e)})}regex(e,t){return this._addCheck({kind:"regex",regex:e,...we.errToObj(t)})}includes(e,t){return this._addCheck({kind:"includes",value:e,position:t?.position,...we.errToObj(t?.message)})}startsWith(e,t){return this._addCheck({kind:"startsWith",value:e,...we.errToObj(t)})}endsWith(e,t){return this._addCheck({kind:"endsWith",value:e,...we.errToObj(t)})}min(e,t){return this._addCheck({kind:"min",value:e,...we.errToObj(t)})}max(e,t){return this._addCheck({kind:"max",value:e,...we.errToObj(t)})}length(e,t){return this._addCheck({kind:"length",value:e,...we.errToObj(t)})}nonempty(e){return this.min(1,we.errToObj(e))}trim(){return new Pn({...this._def,checks:[...this._def.checks,{kind:"trim"}]})}toLowerCase(){return new Pn({...this._def,checks:[...this._def.checks,{kind:"toLowerCase"}]})}toUpperCase(){return new Pn({...this._def,checks:[...this._def.checks,{kind:"toUpperCase"}]})}get isDatetime(){return!!this._def.checks.find(e=>e.kind==="datetime")}get isDate(){return!!this._def.checks.find(e=>e.kind==="date")}get isTime(){return!!this._def.checks.find(e=>e.kind==="time")}get isDuration(){return!!this._def.checks.find(e=>e.kind==="duration")}get isEmail(){return!!this._def.checks.find(e=>e.kind==="email")}get isURL(){return!!this._def.checks.find(e=>e.kind==="url")}get isEmoji(){return!!this._def.checks.find(e=>e.kind==="emoji")}get isUUID(){return!!this._def.checks.find(e=>e.kind==="uuid")}get isNANOID(){return!!this._def.checks.find(e=>e.kind==="nanoid")}get isCUID(){return!!this._def.checks.find(e=>e.kind==="cuid")}get isCUID2(){return!!this._def.checks.find(e=>e.kind==="cuid2")}get isULID(){return!!this._def.checks.find(e=>e.kind==="ulid")}get isIP(){return!!this._def.checks.find(e=>e.kind==="ip")}get isCIDR(){return!!this._def.checks.find(e=>e.kind==="cidr")}get isBase64(){return!!this._def.checks.find(e=>e.kind==="base64")}get isBase64url(){return!!this._def.checks.find(e=>e.kind==="base64url")}get minLength(){let e=null;for(const t of this._def.checks)t.kind==="min"&&(e===null||t.value>e)&&(e=t.value);return e}get maxLength(){let e=null;for(const t of this._def.checks)t.kind==="max"&&(e===null||t.value<e)&&(e=t.value);return e}}Pn.create=i=>new Pn({checks:[],typeName:Oe.ZodString,coerce:i?.coerce??!1,...qe(i)});function Rh(i,e){const t=(i.toString().split(".")[1]||"").length,n=(e.toString().split(".")[1]||"").length,r=t>n?t:n,s=Number.parseInt(i.toFixed(r).replace(".","")),a=Number.parseInt(e.toFixed(r).replace(".",""));return s%a/10**r}class Ki extends Je{constructor(){super(...arguments),this.min=this.gte,this.max=this.lte,this.step=this.multipleOf}_parse(e){if(this._def.coerce&&(e.data=Number(e.data)),this._getType(e)!==Se.number){const s=this._getOrReturnCtx(e);return pe(s,{code:re.invalid_type,expected:Se.number,received:s.parsedType}),ze}let n;const r=new Wt;for(const s of this._def.checks)s.kind==="int"?at.isInteger(e.data)||(n=this._getOrReturnCtx(e,n),pe(n,{code:re.invalid_type,expected:"integer",received:"float",message:s.message}),r.dirty()):s.kind==="min"?(s.inclusive?e.data<s.value:e.data<=s.value)&&(n=this._getOrReturnCtx(e,n),pe(n,{code:re.too_small,minimum:s.value,type:"number",inclusive:s.inclusive,exact:!1,message:s.message}),r.dirty()):s.kind==="max"?(s.inclusive?e.data>s.value:e.data>=s.value)&&(n=this._getOrReturnCtx(e,n),pe(n,{code:re.too_big,maximum:s.value,type:"number",inclusive:s.inclusive,exact:!1,message:s.message}),r.dirty()):s.kind==="multipleOf"?Rh(e.data,s.value)!==0&&(n=this._getOrReturnCtx(e,n),pe(n,{code:re.not_multiple_of,multipleOf:s.value,message:s.message}),r.dirty()):s.kind==="finite"?Number.isFinite(e.data)||(n=this._getOrReturnCtx(e,n),pe(n,{code:re.not_finite,message:s.message}),r.dirty()):at.assertNever(s);return{status:r.value,value:e.data}}gte(e,t){return this.setLimit("min",e,!0,we.toString(t))}gt(e,t){return this.setLimit("min",e,!1,we.toString(t))}lte(e,t){return this.setLimit("max",e,!0,we.toString(t))}lt(e,t){return this.setLimit("max",e,!1,we.toString(t))}setLimit(e,t,n,r){return new Ki({...this._def,checks:[...this._def.checks,{kind:e,value:t,inclusive:n,message:we.toString(r)}]})}_addCheck(e){return new Ki({...this._def,checks:[...this._def.checks,e]})}int(e){return this._addCheck({kind:"int",message:we.toString(e)})}positive(e){return this._addCheck({kind:"min",value:0,inclusive:!1,message:we.toString(e)})}negative(e){return this._addCheck({kind:"max",value:0,inclusive:!1,message:we.toString(e)})}nonpositive(e){return this._addCheck({kind:"max",value:0,inclusive:!0,message:we.toString(e)})}nonnegative(e){return this._addCheck({kind:"min",value:0,inclusive:!0,message:we.toString(e)})}multipleOf(e,t){return this._addCheck({kind:"multipleOf",value:e,message:we.toString(t)})}finite(e){return this._addCheck({kind:"finite",message:we.toString(e)})}safe(e){return this._addCheck({kind:"min",inclusive:!0,value:Number.MIN_SAFE_INTEGER,message:we.toString(e)})._addCheck({kind:"max",inclusive:!0,value:Number.MAX_SAFE_INTEGER,message:we.toString(e)})}get minValue(){let e=null;for(const t of this._def.checks)t.kind==="min"&&(e===null||t.value>e)&&(e=t.value);return e}get maxValue(){let e=null;for(const t of this._def.checks)t.kind==="max"&&(e===null||t.value<e)&&(e=t.value);return e}get isInt(){return!!this._def.checks.find(e=>e.kind==="int"||e.kind==="multipleOf"&&at.isInteger(e.value))}get isFinite(){let e=null,t=null;for(const n of this._def.checks){if(n.kind==="finite"||n.kind==="int"||n.kind==="multipleOf")return!0;n.kind==="min"?(t===null||n.value>t)&&(t=n.value):n.kind==="max"&&(e===null||n.value<e)&&(e=n.value)}return Number.isFinite(t)&&Number.isFinite(e)}}Ki.create=i=>new Ki({checks:[],typeName:Oe.ZodNumber,coerce:i?.coerce||!1,...qe(i)});class Rr extends Je{constructor(){super(...arguments),this.min=this.gte,this.max=this.lte}_parse(e){if(this._def.coerce)try{e.data=BigInt(e.data)}catch{return this._getInvalidInput(e)}if(this._getType(e)!==Se.bigint)return this._getInvalidInput(e);let n;const r=new Wt;for(const s of this._def.checks)s.kind==="min"?(s.inclusive?e.data<s.value:e.data<=s.value)&&(n=this._getOrReturnCtx(e,n),pe(n,{code:re.too_small,type:"bigint",minimum:s.value,inclusive:s.inclusive,message:s.message}),r.dirty()):s.kind==="max"?(s.inclusive?e.data>s.value:e.data>=s.value)&&(n=this._getOrReturnCtx(e,n),pe(n,{code:re.too_big,type:"bigint",maximum:s.value,inclusive:s.inclusive,message:s.message}),r.dirty()):s.kind==="multipleOf"?e.data%s.value!==BigInt(0)&&(n=this._getOrReturnCtx(e,n),pe(n,{code:re.not_multiple_of,multipleOf:s.value,message:s.message}),r.dirty()):at.assertNever(s);return{status:r.value,value:e.data}}_getInvalidInput(e){const t=this._getOrReturnCtx(e);return pe(t,{code:re.invalid_type,expected:Se.bigint,received:t.parsedType}),ze}gte(e,t){return this.setLimit("min",e,!0,we.toString(t))}gt(e,t){return this.setLimit("min",e,!1,we.toString(t))}lte(e,t){return this.setLimit("max",e,!0,we.toString(t))}lt(e,t){return this.setLimit("max",e,!1,we.toString(t))}setLimit(e,t,n,r){return new Rr({...this._def,checks:[...this._def.checks,{kind:e,value:t,inclusive:n,message:we.toString(r)}]})}_addCheck(e){return new Rr({...this._def,checks:[...this._def.checks,e]})}positive(e){return this._addCheck({kind:"min",value:BigInt(0),inclusive:!1,message:we.toString(e)})}negative(e){return this._addCheck({kind:"max",value:BigInt(0),inclusive:!1,message:we.toString(e)})}nonpositive(e){return this._addCheck({kind:"max",value:BigInt(0),inclusive:!0,message:we.toString(e)})}nonnegative(e){return this._addCheck({kind:"min",value:BigInt(0),inclusive:!0,message:we.toString(e)})}multipleOf(e,t){return this._addCheck({kind:"multipleOf",value:e,message:we.toString(t)})}get minValue(){let e=null;for(const t of this._def.checks)t.kind==="min"&&(e===null||t.value>e)&&(e=t.value);return e}get maxValue(){let e=null;for(const t of this._def.checks)t.kind==="max"&&(e===null||t.value<e)&&(e=t.value);return e}}Rr.create=i=>new Rr({checks:[],typeName:Oe.ZodBigInt,coerce:i?.coerce??!1,...qe(i)});class Ga extends Je{_parse(e){if(this._def.coerce&&(e.data=!!e.data),this._getType(e)!==Se.boolean){const n=this._getOrReturnCtx(e);return pe(n,{code:re.invalid_type,expected:Se.boolean,received:n.parsedType}),ze}return an(e.data)}}Ga.create=i=>new Ga({typeName:Oe.ZodBoolean,coerce:i?.coerce||!1,...qe(i)});class Cs extends Je{_parse(e){if(this._def.coerce&&(e.data=new Date(e.data)),this._getType(e)!==Se.date){const s=this._getOrReturnCtx(e);return pe(s,{code:re.invalid_type,expected:Se.date,received:s.parsedType}),ze}if(Number.isNaN(e.data.getTime())){const s=this._getOrReturnCtx(e);return pe(s,{code:re.invalid_date}),ze}const n=new Wt;let r;for(const s of this._def.checks)s.kind==="min"?e.data.getTime()<s.value&&(r=this._getOrReturnCtx(e,r),pe(r,{code:re.too_small,message:s.message,inclusive:!0,exact:!1,minimum:s.value,type:"date"}),n.dirty()):s.kind==="max"?e.data.getTime()>s.value&&(r=this._getOrReturnCtx(e,r),pe(r,{code:re.too_big,message:s.message,inclusive:!0,exact:!1,maximum:s.value,type:"date"}),n.dirty()):at.assertNever(s);return{status:n.value,value:new Date(e.data.getTime())}}_addCheck(e){return new Cs({...this._def,checks:[...this._def.checks,e]})}min(e,t){return this._addCheck({kind:"min",value:e.getTime(),message:we.toString(t)})}max(e,t){return this._addCheck({kind:"max",value:e.getTime(),message:we.toString(t)})}get minDate(){let e=null;for(const t of this._def.checks)t.kind==="min"&&(e===null||t.value>e)&&(e=t.value);return e!=null?new Date(e):null}get maxDate(){let e=null;for(const t of this._def.checks)t.kind==="max"&&(e===null||t.value<e)&&(e=t.value);return e!=null?new Date(e):null}}Cs.create=i=>new Cs({checks:[],coerce:i?.coerce||!1,typeName:Oe.ZodDate,...qe(i)});class _c extends Je{_parse(e){if(this._getType(e)!==Se.symbol){const n=this._getOrReturnCtx(e);return pe(n,{code:re.invalid_type,expected:Se.symbol,received:n.parsedType}),ze}return an(e.data)}}_c.create=i=>new _c({typeName:Oe.ZodSymbol,...qe(i)});class vc extends Je{_parse(e){if(this._getType(e)!==Se.undefined){const n=this._getOrReturnCtx(e);return pe(n,{code:re.invalid_type,expected:Se.undefined,received:n.parsedType}),ze}return an(e.data)}}vc.create=i=>new vc({typeName:Oe.ZodUndefined,...qe(i)});class xc extends Je{_parse(e){if(this._getType(e)!==Se.null){const n=this._getOrReturnCtx(e);return pe(n,{code:re.invalid_type,expected:Se.null,received:n.parsedType}),ze}return an(e.data)}}xc.create=i=>new xc({typeName:Oe.ZodNull,...qe(i)});class Va extends Je{constructor(){super(...arguments),this._any=!0}_parse(e){return an(e.data)}}Va.create=i=>new Va({typeName:Oe.ZodAny,...qe(i)});class Mc extends Je{constructor(){super(...arguments),this._unknown=!0}_parse(e){return an(e.data)}}Mc.create=i=>new Mc({typeName:Oe.ZodUnknown,...qe(i)});class Jn extends Je{_parse(e){const t=this._getOrReturnCtx(e);return pe(t,{code:re.invalid_type,expected:Se.never,received:t.parsedType}),ze}}Jn.create=i=>new Jn({typeName:Oe.ZodNever,...qe(i)});class yc extends Je{_parse(e){if(this._getType(e)!==Se.undefined){const n=this._getOrReturnCtx(e);return pe(n,{code:re.invalid_type,expected:Se.void,received:n.parsedType}),ze}return an(e.data)}}yc.create=i=>new yc({typeName:Oe.ZodVoid,...qe(i)});class vn extends Je{_parse(e){const{ctx:t,status:n}=this._processInputParams(e),r=this._def;if(t.parsedType!==Se.array)return pe(t,{code:re.invalid_type,expected:Se.array,received:t.parsedType}),ze;if(r.exactLength!==null){const a=t.data.length>r.exactLength.value,o=t.data.length<r.exactLength.value;(a||o)&&(pe(t,{code:a?re.too_big:re.too_small,minimum:o?r.exactLength.value:void 0,maximum:a?r.exactLength.value:void 0,type:"array",inclusive:!0,exact:!0,message:r.exactLength.message}),n.dirty())}if(r.minLength!==null&&t.data.length<r.minLength.value&&(pe(t,{code:re.too_small,minimum:r.minLength.value,type:"array",inclusive:!0,exact:!1,message:r.minLength.message}),n.dirty()),r.maxLength!==null&&t.data.length>r.maxLength.value&&(pe(t,{code:re.too_big,maximum:r.maxLength.value,type:"array",inclusive:!0,exact:!1,message:r.maxLength.message}),n.dirty()),t.common.async)return Promise.all([...t.data].map((a,o)=>r.type._parseAsync(new yn(t,a,t.path,o)))).then(a=>Wt.mergeArray(n,a));const s=[...t.data].map((a,o)=>r.type._parseSync(new yn(t,a,t.path,o)));return Wt.mergeArray(n,s)}get element(){return this._def.type}min(e,t){return new vn({...this._def,minLength:{value:e,message:we.toString(t)}})}max(e,t){return new vn({...this._def,maxLength:{value:e,message:we.toString(t)}})}length(e,t){return new vn({...this._def,exactLength:{value:e,message:we.toString(t)}})}nonempty(e){return this.min(1,e)}}vn.create=(i,e)=>new vn({type:i,minLength:null,maxLength:null,exactLength:null,typeName:Oe.ZodArray,...qe(e)});function Gi(i){if(i instanceof Ct){const e={};for(const t in i.shape){const n=i.shape[t];e[t]=$n.create(Gi(n))}return new Ct({...i._def,shape:()=>e})}else return i instanceof vn?new vn({...i._def,type:Gi(i.element)}):i instanceof $n?$n.create(Gi(i.unwrap())):i instanceof Qi?Qi.create(Gi(i.unwrap())):i instanceof mi?mi.create(i.items.map(e=>Gi(e))):i}class Ct extends Je{constructor(){super(...arguments),this._cached=null,this.nonstrict=this.passthrough,this.augment=this.extend}_getCached(){if(this._cached!==null)return this._cached;const e=this._def.shape(),t=at.objectKeys(e);return this._cached={shape:e,keys:t},this._cached}_parse(e){if(this._getType(e)!==Se.object){const l=this._getOrReturnCtx(e);return pe(l,{code:re.invalid_type,expected:Se.object,received:l.parsedType}),ze}const{status:n,ctx:r}=this._processInputParams(e),{shape:s,keys:a}=this._getCached(),o=[];if(!(this._def.catchall instanceof Jn&&this._def.unknownKeys==="strip"))for(const l in r.data)a.includes(l)||o.push(l);const c=[];for(const l of a){const u=s[l],h=r.data[l];c.push({key:{status:"valid",value:l},value:u._parse(new yn(r,h,r.path,l)),alwaysSet:l in r.data})}if(this._def.catchall instanceof Jn){const l=this._def.unknownKeys;if(l==="passthrough")for(const u of o)c.push({key:{status:"valid",value:u},value:{status:"valid",value:r.data[u]}});else if(l==="strict")o.length>0&&(pe(r,{code:re.unrecognized_keys,keys:o}),n.dirty());else if(l!=="strip")throw new Error("Internal ZodObject error: invalid unknownKeys value.")}else{const l=this._def.catchall;for(const u of o){const h=r.data[u];c.push({key:{status:"valid",value:u},value:l._parse(new yn(r,h,r.path,u)),alwaysSet:u in r.data})}}return r.common.async?Promise.resolve().then(async()=>{const l=[];for(const u of c){const h=await u.key,d=await u.value;l.push({key:h,value:d,alwaysSet:u.alwaysSet})}return l}).then(l=>Wt.mergeObjectSync(n,l)):Wt.mergeObjectSync(n,c)}get shape(){return this._def.shape()}strict(e){return we.errToObj,new Ct({...this._def,unknownKeys:"strict",...e!==void 0?{errorMap:(t,n)=>{const r=this._def.errorMap?.(t,n).message??n.defaultError;return t.code==="unrecognized_keys"?{message:we.errToObj(e).message??r}:{message:r}}}:{}})}strip(){return new Ct({...this._def,unknownKeys:"strip"})}passthrough(){return new Ct({...this._def,unknownKeys:"passthrough"})}extend(e){return new Ct({...this._def,shape:()=>({...this._def.shape(),...e})})}merge(e){return new Ct({unknownKeys:e._def.unknownKeys,catchall:e._def.catchall,shape:()=>({...this._def.shape(),...e._def.shape()}),typeName:Oe.ZodObject})}setKey(e,t){return this.augment({[e]:t})}catchall(e){return new Ct({...this._def,catchall:e})}pick(e){const t={};for(const n of at.objectKeys(e))e[n]&&this.shape[n]&&(t[n]=this.shape[n]);return new Ct({...this._def,shape:()=>t})}omit(e){const t={};for(const n of at.objectKeys(this.shape))e[n]||(t[n]=this.shape[n]);return new Ct({...this._def,shape:()=>t})}deepPartial(){return Gi(this)}partial(e){const t={};for(const n of at.objectKeys(this.shape)){const r=this.shape[n];e&&!e[n]?t[n]=r:t[n]=r.optional()}return new Ct({...this._def,shape:()=>t})}required(e){const t={};for(const n of at.objectKeys(this.shape))if(e&&!e[n])t[n]=this.shape[n];else{let s=this.shape[n];for(;s instanceof $n;)s=s._def.innerType;t[n]=s}return new Ct({...this._def,shape:()=>t})}keyof(){return Vl(at.objectKeys(this.shape))}}Ct.create=(i,e)=>new Ct({shape:()=>i,unknownKeys:"strip",catchall:Jn.create(),typeName:Oe.ZodObject,...qe(e)});Ct.strictCreate=(i,e)=>new Ct({shape:()=>i,unknownKeys:"strict",catchall:Jn.create(),typeName:Oe.ZodObject,...qe(e)});Ct.lazycreate=(i,e)=>new Ct({shape:i,unknownKeys:"strip",catchall:Jn.create(),typeName:Oe.ZodObject,...qe(e)});class Ps extends Je{_parse(e){const{ctx:t}=this._processInputParams(e),n=this._def.options;function r(s){for(const o of s)if(o.result.status==="valid")return o.result;for(const o of s)if(o.result.status==="dirty")return t.common.issues.push(...o.ctx.common.issues),o.result;const a=s.map(o=>new Nn(o.ctx.common.issues));return pe(t,{code:re.invalid_union,unionErrors:a}),ze}if(t.common.async)return Promise.all(n.map(async s=>{const a={...t,common:{...t.common,issues:[]},parent:null};return{result:await s._parseAsync({data:t.data,path:t.path,parent:a}),ctx:a}})).then(r);{let s;const a=[];for(const c of n){const l={...t,common:{...t.common,issues:[]},parent:null},u=c._parseSync({data:t.data,path:t.path,parent:l});if(u.status==="valid")return u;u.status==="dirty"&&!s&&(s={result:u,ctx:l}),l.common.issues.length&&a.push(l.common.issues)}if(s)return t.common.issues.push(...s.ctx.common.issues),s.result;const o=a.map(c=>new Nn(c));return pe(t,{code:re.invalid_union,unionErrors:o}),ze}}get options(){return this._def.options}}Ps.create=(i,e)=>new Ps({options:i,typeName:Oe.ZodUnion,...qe(e)});function Ha(i,e){const t=Yn(i),n=Yn(e);if(i===e)return{valid:!0,data:i};if(t===Se.object&&n===Se.object){const r=at.objectKeys(e),s=at.objectKeys(i).filter(o=>r.indexOf(o)!==-1),a={...i,...e};for(const o of s){const c=Ha(i[o],e[o]);if(!c.valid)return{valid:!1};a[o]=c.data}return{valid:!0,data:a}}else if(t===Se.array&&n===Se.array){if(i.length!==e.length)return{valid:!1};const r=[];for(let s=0;s<i.length;s++){const a=i[s],o=e[s],c=Ha(a,o);if(!c.valid)return{valid:!1};r.push(c.data)}return{valid:!0,data:r}}else return t===Se.date&&n===Se.date&&+i==+e?{valid:!0,data:i}:{valid:!1}}class Ls extends Je{_parse(e){const{status:t,ctx:n}=this._processInputParams(e),r=(s,a)=>{if(pc(s)||pc(a))return ze;const o=Ha(s.value,a.value);return o.valid?((mc(s)||mc(a))&&t.dirty(),{status:t.value,value:o.data}):(pe(n,{code:re.invalid_intersection_types}),ze)};return n.common.async?Promise.all([this._def.left._parseAsync({data:n.data,path:n.path,parent:n}),this._def.right._parseAsync({data:n.data,path:n.path,parent:n})]).then(([s,a])=>r(s,a)):r(this._def.left._parseSync({data:n.data,path:n.path,parent:n}),this._def.right._parseSync({data:n.data,path:n.path,parent:n}))}}Ls.create=(i,e,t)=>new Ls({left:i,right:e,typeName:Oe.ZodIntersection,...qe(t)});class mi extends Je{_parse(e){const{status:t,ctx:n}=this._processInputParams(e);if(n.parsedType!==Se.array)return pe(n,{code:re.invalid_type,expected:Se.array,received:n.parsedType}),ze;if(n.data.length<this._def.items.length)return pe(n,{code:re.too_small,minimum:this._def.items.length,inclusive:!0,exact:!1,type:"array"}),ze;!this._def.rest&&n.data.length>this._def.items.length&&(pe(n,{code:re.too_big,maximum:this._def.items.length,inclusive:!0,exact:!1,type:"array"}),t.dirty());const s=[...n.data].map((a,o)=>{const c=this._def.items[o]||this._def.rest;return c?c._parse(new yn(n,a,n.path,o)):null}).filter(a=>!!a);return n.common.async?Promise.all(s).then(a=>Wt.mergeArray(t,a)):Wt.mergeArray(t,s)}get items(){return this._def.items}rest(e){return new mi({...this._def,rest:e})}}mi.create=(i,e)=>{if(!Array.isArray(i))throw new Error("You must pass an array of schemas to z.tuple([ ... ])");return new mi({items:i,typeName:Oe.ZodTuple,rest:null,...qe(e)})};class Is extends Je{get keySchema(){return this._def.keyType}get valueSchema(){return this._def.valueType}_parse(e){const{status:t,ctx:n}=this._processInputParams(e);if(n.parsedType!==Se.object)return pe(n,{code:re.invalid_type,expected:Se.object,received:n.parsedType}),ze;const r=[],s=this._def.keyType,a=this._def.valueType;for(const o in n.data)r.push({key:s._parse(new yn(n,o,n.path,o)),value:a._parse(new yn(n,n.data[o],n.path,o)),alwaysSet:o in n.data});return n.common.async?Wt.mergeObjectAsync(t,r):Wt.mergeObjectSync(t,r)}get element(){return this._def.valueType}static create(e,t,n){return t instanceof Je?new Is({keyType:e,valueType:t,typeName:Oe.ZodRecord,...qe(n)}):new Is({keyType:Pn.create(),valueType:e,typeName:Oe.ZodRecord,...qe(t)})}}class Sc extends Je{get keySchema(){return this._def.keyType}get valueSchema(){return this._def.valueType}_parse(e){const{status:t,ctx:n}=this._processInputParams(e);if(n.parsedType!==Se.map)return pe(n,{code:re.invalid_type,expected:Se.map,received:n.parsedType}),ze;const r=this._def.keyType,s=this._def.valueType,a=[...n.data.entries()].map(([o,c],l)=>({key:r._parse(new yn(n,o,n.path,[l,"key"])),value:s._parse(new yn(n,c,n.path,[l,"value"]))}));if(n.common.async){const o=new Map;return Promise.resolve().then(async()=>{for(const c of a){const l=await c.key,u=await c.value;if(l.status==="aborted"||u.status==="aborted")return ze;(l.status==="dirty"||u.status==="dirty")&&t.dirty(),o.set(l.value,u.value)}return{status:t.value,value:o}})}else{const o=new Map;for(const c of a){const l=c.key,u=c.value;if(l.status==="aborted"||u.status==="aborted")return ze;(l.status==="dirty"||u.status==="dirty")&&t.dirty(),o.set(l.value,u.value)}return{status:t.value,value:o}}}}Sc.create=(i,e,t)=>new Sc({valueType:e,keyType:i,typeName:Oe.ZodMap,...qe(t)});class Cr extends Je{_parse(e){const{status:t,ctx:n}=this._processInputParams(e);if(n.parsedType!==Se.set)return pe(n,{code:re.invalid_type,expected:Se.set,received:n.parsedType}),ze;const r=this._def;r.minSize!==null&&n.data.size<r.minSize.value&&(pe(n,{code:re.too_small,minimum:r.minSize.value,type:"set",inclusive:!0,exact:!1,message:r.minSize.message}),t.dirty()),r.maxSize!==null&&n.data.size>r.maxSize.value&&(pe(n,{code:re.too_big,maximum:r.maxSize.value,type:"set",inclusive:!0,exact:!1,message:r.maxSize.message}),t.dirty());const s=this._def.valueType;function a(c){const l=new Set;for(const u of c){if(u.status==="aborted")return ze;u.status==="dirty"&&t.dirty(),l.add(u.value)}return{status:t.value,value:l}}const o=[...n.data.values()].map((c,l)=>s._parse(new yn(n,c,n.path,l)));return n.common.async?Promise.all(o).then(c=>a(c)):a(o)}min(e,t){return new Cr({...this._def,minSize:{value:e,message:we.toString(t)}})}max(e,t){return new Cr({...this._def,maxSize:{value:e,message:we.toString(t)}})}size(e,t){return this.min(e,t).max(e,t)}nonempty(e){return this.min(1,e)}}Cr.create=(i,e)=>new Cr({valueType:i,minSize:null,maxSize:null,typeName:Oe.ZodSet,...qe(e)});class Ec extends Je{get schema(){return this._def.getter()}_parse(e){const{ctx:t}=this._processInputParams(e);return this._def.getter()._parse({data:t.data,path:t.path,parent:t})}}Ec.create=(i,e)=>new Ec({getter:i,typeName:Oe.ZodLazy,...qe(e)});class Tc extends Je{_parse(e){if(e.data!==this._def.value){const t=this._getOrReturnCtx(e);return pe(t,{received:t.data,code:re.invalid_literal,expected:this._def.value}),ze}return{status:"valid",value:e.data}}get value(){return this._def.value}}Tc.create=(i,e)=>new Tc({value:i,typeName:Oe.ZodLiteral,...qe(e)});function Vl(i,e){return new ji({values:i,typeName:Oe.ZodEnum,...qe(e)})}class ji extends Je{_parse(e){if(typeof e.data!="string"){const t=this._getOrReturnCtx(e),n=this._def.values;return pe(t,{expected:at.joinValues(n),received:t.parsedType,code:re.invalid_type}),ze}if(this._cache||(this._cache=new Set(this._def.values)),!this._cache.has(e.data)){const t=this._getOrReturnCtx(e),n=this._def.values;return pe(t,{received:t.data,code:re.invalid_enum_value,options:n}),ze}return an(e.data)}get options(){return this._def.values}get enum(){const e={};for(const t of this._def.values)e[t]=t;return e}get Values(){const e={};for(const t of this._def.values)e[t]=t;return e}get Enum(){const e={};for(const t of this._def.values)e[t]=t;return e}extract(e,t=this._def){return ji.create(e,{...this._def,...t})}exclude(e,t=this._def){return ji.create(this.options.filter(n=>!e.includes(n)),{...this._def,...t})}}ji.create=Vl;class bc extends Je{_parse(e){const t=at.getValidEnumValues(this._def.values),n=this._getOrReturnCtx(e);if(n.parsedType!==Se.string&&n.parsedType!==Se.number){const r=at.objectValues(t);return pe(n,{expected:at.joinValues(r),received:n.parsedType,code:re.invalid_type}),ze}if(this._cache||(this._cache=new Set(at.getValidEnumValues(this._def.values))),!this._cache.has(e.data)){const r=at.objectValues(t);return pe(n,{received:n.data,code:re.invalid_enum_value,options:r}),ze}return an(e.data)}get enum(){return this._def.values}}bc.create=(i,e)=>new bc({values:i,typeName:Oe.ZodNativeEnum,...qe(e)});class Ds extends Je{unwrap(){return this._def.type}_parse(e){const{ctx:t}=this._processInputParams(e);if(t.parsedType!==Se.promise&&t.common.async===!1)return pe(t,{code:re.invalid_type,expected:Se.promise,received:t.parsedType}),ze;const n=t.parsedType===Se.promise?t.data:Promise.resolve(t.data);return an(n.then(r=>this._def.type.parseAsync(r,{path:t.path,errorMap:t.common.contextualErrorMap})))}}Ds.create=(i,e)=>new Ds({type:i,typeName:Oe.ZodPromise,...qe(e)});class Ji extends Je{innerType(){return this._def.schema}sourceType(){return this._def.schema._def.typeName===Oe.ZodEffects?this._def.schema.sourceType():this._def.schema}_parse(e){const{status:t,ctx:n}=this._processInputParams(e),r=this._def.effect||null,s={addIssue:a=>{pe(n,a),a.fatal?t.abort():t.dirty()},get path(){return n.path}};if(s.addIssue=s.addIssue.bind(s),r.type==="preprocess"){const a=r.transform(n.data,s);if(n.common.async)return Promise.resolve(a).then(async o=>{if(t.value==="aborted")return ze;const c=await this._def.schema._parseAsync({data:o,path:n.path,parent:n});return c.status==="aborted"?ze:c.status==="dirty"||t.value==="dirty"?yr(c.value):c});{if(t.value==="aborted")return ze;const o=this._def.schema._parseSync({data:a,path:n.path,parent:n});return o.status==="aborted"?ze:o.status==="dirty"||t.value==="dirty"?yr(o.value):o}}if(r.type==="refinement"){const a=o=>{const c=r.refinement(o,s);if(n.common.async)return Promise.resolve(c);if(c instanceof Promise)throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");return o};if(n.common.async===!1){const o=this._def.schema._parseSync({data:n.data,path:n.path,parent:n});return o.status==="aborted"?ze:(o.status==="dirty"&&t.dirty(),a(o.value),{status:t.value,value:o.value})}else return this._def.schema._parseAsync({data:n.data,path:n.path,parent:n}).then(o=>o.status==="aborted"?ze:(o.status==="dirty"&&t.dirty(),a(o.value).then(()=>({status:t.value,value:o.value}))))}if(r.type==="transform")if(n.common.async===!1){const a=this._def.schema._parseSync({data:n.data,path:n.path,parent:n});if(!$i(a))return ze;const o=r.transform(a.value,s);if(o instanceof Promise)throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");return{status:t.value,value:o}}else return this._def.schema._parseAsync({data:n.data,path:n.path,parent:n}).then(a=>$i(a)?Promise.resolve(r.transform(a.value,s)).then(o=>({status:t.value,value:o})):ze);at.assertNever(r)}}Ji.create=(i,e,t)=>new Ji({schema:i,typeName:Oe.ZodEffects,effect:e,...qe(t)});Ji.createWithPreprocess=(i,e,t)=>new Ji({schema:e,effect:{type:"preprocess",transform:i},typeName:Oe.ZodEffects,...qe(t)});class $n extends Je{_parse(e){return this._getType(e)===Se.undefined?an(void 0):this._def.innerType._parse(e)}unwrap(){return this._def.innerType}}$n.create=(i,e)=>new $n({innerType:i,typeName:Oe.ZodOptional,...qe(e)});class Qi extends Je{_parse(e){return this._getType(e)===Se.null?an(null):this._def.innerType._parse(e)}unwrap(){return this._def.innerType}}Qi.create=(i,e)=>new Qi({innerType:i,typeName:Oe.ZodNullable,...qe(e)});class Wa extends Je{_parse(e){const{ctx:t}=this._processInputParams(e);let n=t.data;return t.parsedType===Se.undefined&&(n=this._def.defaultValue()),this._def.innerType._parse({data:n,path:t.path,parent:t})}removeDefault(){return this._def.innerType}}Wa.create=(i,e)=>new Wa({innerType:i,typeName:Oe.ZodDefault,defaultValue:typeof e.default=="function"?e.default:()=>e.default,...qe(e)});class Xa extends Je{_parse(e){const{ctx:t}=this._processInputParams(e),n={...t,common:{...t.common,issues:[]}},r=this._def.innerType._parse({data:n.data,path:n.path,parent:{...n}});return Rs(r)?r.then(s=>({status:"valid",value:s.status==="valid"?s.value:this._def.catchValue({get error(){return new Nn(n.common.issues)},input:n.data})})):{status:"valid",value:r.status==="valid"?r.value:this._def.catchValue({get error(){return new Nn(n.common.issues)},input:n.data})}}removeCatch(){return this._def.innerType}}Xa.create=(i,e)=>new Xa({innerType:i,typeName:Oe.ZodCatch,catchValue:typeof e.catch=="function"?e.catch:()=>e.catch,...qe(e)});class Ac extends Je{_parse(e){if(this._getType(e)!==Se.nan){const n=this._getOrReturnCtx(e);return pe(n,{code:re.invalid_type,expected:Se.nan,received:n.parsedType}),ze}return{status:"valid",value:e.data}}}Ac.create=i=>new Ac({typeName:Oe.ZodNaN,...qe(i)});class Ch extends Je{_parse(e){const{ctx:t}=this._processInputParams(e),n=t.data;return this._def.type._parse({data:n,path:t.path,parent:t})}unwrap(){return this._def.type}}class Vo extends Je{_parse(e){const{status:t,ctx:n}=this._processInputParams(e);if(n.common.async)return(async()=>{const s=await this._def.in._parseAsync({data:n.data,path:n.path,parent:n});return s.status==="aborted"?ze:s.status==="dirty"?(t.dirty(),yr(s.value)):this._def.out._parseAsync({data:s.value,path:n.path,parent:n})})();{const r=this._def.in._parseSync({data:n.data,path:n.path,parent:n});return r.status==="aborted"?ze:r.status==="dirty"?(t.dirty(),{status:"dirty",value:r.value}):this._def.out._parseSync({data:r.value,path:n.path,parent:n})}}static create(e,t){return new Vo({in:e,out:t,typeName:Oe.ZodPipeline})}}class Ya extends Je{_parse(e){const t=this._def.innerType._parse(e),n=r=>($i(r)&&(r.value=Object.freeze(r.value)),r);return Rs(t)?t.then(r=>n(r)):n(t)}unwrap(){return this._def.innerType}}Ya.create=(i,e)=>new Ya({innerType:i,typeName:Oe.ZodReadonly,...qe(e)});var Oe;(function(i){i.ZodString="ZodString",i.ZodNumber="ZodNumber",i.ZodNaN="ZodNaN",i.ZodBigInt="ZodBigInt",i.ZodBoolean="ZodBoolean",i.ZodDate="ZodDate",i.ZodSymbol="ZodSymbol",i.ZodUndefined="ZodUndefined",i.ZodNull="ZodNull",i.ZodAny="ZodAny",i.ZodUnknown="ZodUnknown",i.ZodNever="ZodNever",i.ZodVoid="ZodVoid",i.ZodArray="ZodArray",i.ZodObject="ZodObject",i.ZodUnion="ZodUnion",i.ZodDiscriminatedUnion="ZodDiscriminatedUnion",i.ZodIntersection="ZodIntersection",i.ZodTuple="ZodTuple",i.ZodRecord="ZodRecord",i.ZodMap="ZodMap",i.ZodSet="ZodSet",i.ZodFunction="ZodFunction",i.ZodLazy="ZodLazy",i.ZodLiteral="ZodLiteral",i.ZodEnum="ZodEnum",i.ZodEffects="ZodEffects",i.ZodNativeEnum="ZodNativeEnum",i.ZodOptional="ZodOptional",i.ZodNullable="ZodNullable",i.ZodDefault="ZodDefault",i.ZodCatch="ZodCatch",i.ZodPromise="ZodPromise",i.ZodBranded="ZodBranded",i.ZodPipeline="ZodPipeline",i.ZodReadonly="ZodReadonly"})(Oe||(Oe={}));const Yt=Pn.create,$e=Ki.create,Ph=Ga.create,Lh=Va.create;Jn.create;vn.create;const _n=Ct.create;Ps.create;Ls.create;mi.create;const Xn=Is.create,Ih=ji.create;Ds.create;$n.create;Qi.create;const Dh=_n({speedMps:$e().positive(),valueInr:$e().nullable(),rcsM2:$e().positive(),defaultClass:Yt()}),Nh=_n({id:Yt(),name:Yt(),costInr:$e().nonnegative(),pk0:$e().min(0).max(1),pk0RfSilent:$e().min(0).max(1),pk0Swarm:$e().min(0).max(1).optional(),envelopeMinM:$e().nonnegative(),envelopeMaxM:$e().positive(),we:$e().min(0).max(1),debrisRadiusM:$e().nonnegative(),tier:Ih(["T1_NON_KINETIC","T2_KINETIC","T3_HEAVY"]),keyHint:Yt(),holdTimeMs:$e().nonnegative()}),Uh=_n({qMin:$e().min(0).max(1),rMinM:$e().positive(),cerUnfavourableThreshold:$e().positive(),radarMaxRangeM:$e().positive(),eoirMaxRangeDayM:$e().positive(),eoirMaxRangeNightM:$e().positive(),rfMaxRangeM:$e().positive(),radarSweepPeriodMs:$e().positive(),radarRpm:$e().positive(),antennaHeightM:$e().positive()}),Fh=_n({defaultHeightM:$e().positive(),defaultShadowM:$e().positive(),defaultRho:$e().min(0).max(1)}),Oh=_n({hostile:_n({d:$e(),c:$e(),g:$e(),r:$e()}),nonHostile:_n({c:$e(),g:$e(),r:$e()}),threatWeights:Xn(Yt(),$e()),penalties:_n({leakerSessionDeduction:$e(),criticalEventDeduction:$e(),roeViolationDeduction:$e()})}),kh=_n({_meta:_n({notional:Ph(),disclaimer:Yt(),version:Yt()}),droneClasses:Xn(Yt(),Dh),effectors:Xn(Yt(),Nh),thresholds:Uh,zones:Xn(Yt(),Fh),scoringWeights:Oh,classificationMatrix:Xn(Yt(),Xn(Yt(),$e())),chaos:Xn(Yt(),Xn(Yt(),Lh()))}),qa=kh.safeParse(ih);if(!qa.success)throw console.error("[Config Error] Inlined configuration failed Zod schema validation:",qa.error.format()),new Error("Invalid application configuration");const vt=qa.data;function Ho(i,e,t){let n=!1;for(let r=0,s=t.length-1;r<t.length;s=r++){const a=t[r][0],o=t[r][1],c=t[s][0],l=t[s][1];o>e!=l>e&&i<(c-a)*(e-o)/(l-o)+a&&(n=!n)}return n}function zs(i,e,t,n){const[r,s]=t,[a,o]=n,c=a-r,l=o-s,u=i*l-e*c;if(Math.abs(u)<1e-9)return null;const h=(r*l-s*c)/u,d=(r*e-s*i)/u;if(h>=0&&h<=1&&d>=0&&d<=1){const f=h*i,g=h*e;return Math.hypot(f,g)}return null}function Wo(i,e){const t=vt.thresholds.antennaHeightM||15,n=Math.hypot(i.x,i.y);if(n<1)return{isMasked:!1,thetaT:0,thetaMask:0,dNearM:0,shadowRemainingM:0};const r=Math.atan2(i.z-t,n);for(const s of e){if(s.polygon.length<3)continue;if(Ho(i.x,i.y,s.polygon)&&i.z<=s.heightM)return{isMasked:!0,zoneId:s.id,thetaT:r,thetaMask:Math.PI/2,dNearM:0,shadowRemainingM:s.shadowM};let o=1/0;for(let c=0;c<s.polygon.length;c++){const l=s.polygon[c],u=s.polygon[(c+1)%s.polygon.length],h=zs(i.x,i.y,l,u);h!==null&&h<o&&(o=h)}if(o<1/0&&o<=n){const c=Math.atan2(s.heightM-t,o),l=n-o;if(r<c&&l<=s.shadowM)return{isMasked:!0,zoneId:s.id,thetaT:r,thetaMask:c,dNearM:o,shadowRemainingM:s.shadowM-l}}}return{isMasked:!1,thetaT:r,thetaMask:0,dNearM:0,shadowRemainingM:0}}function Gs(i){const e=vt.effectors[i],t=e.envelopeMinM,n=e.envelopeMaxM,r=n-t,s=t+.2*r,a=t+.8*r,o=(t+n)/2;return{envelopeMinM:t,envelopeMaxM:n,plateauMinM:s,plateauMaxM:a,rOptM:o}}function Xo(i,e){const{envelopeMinM:t,envelopeMaxM:n,plateauMinM:r,plateauMaxM:s}=Gs(e);if(i<t||i>n)return 0;if(i>=r&&i<=s)return 1;if(i<r){const a=r-t;return a<=0?1:(i-t)/a}else{const a=n-s;return a<=0?1:(n-i)/a}}function Hl(i,e){const t=vt.effectors[i];return t?e.droneType==="SWARM_ELEMENT"&&t.pk0Swarm!==void 0?t.pk0Swarm:e.emitsRf?t.pk0:t.pk0RfSilent??(i==="RF_SOFTKILL"?.1:t.pk0):0}function Wl(i,e={}){const{isFogActive:t=!1,isJammingActive:n=!1}=e;return i==="LASER"&&t?vt.chaos.FOG.laserPkMultiplier??.5:i==="RF_SOFTKILL"&&n?vt.chaos.JAMMING.softKillPkMultiplier??0:1}function Bh(i,e,t,n={}){const r=Hl(i,t),s=Xo(e,i),a=Wl(i,n),o=r*s*a;return Math.min(1,Math.max(0,o))}function lv(i,e,t,n,r={}){const s=Hl(i,t),a=Xo(e,i),o=Wl(i,r),c=s*a*o,l=Math.min(1,Math.max(0,c)),u=n();return{killed:u<=l,pk:l,u,pk0:s,g:a,h:o}}const Pr=.01,Xl=3e3;function uv(i,e=.8){const n=10+12*(i/1e3),r=Math.max(0,1-i/8e3);return{q:e*r,ghostSigmaM:n}}function hv(i,e,t=1){if(e<=0||t<=0)return{snr:0,pd:0};const n=i/Pr*Math.pow(Xl/e,4)*t,r=Math.max(0,Math.min(1,1-Math.exp(-2.303*Math.max(0,n))));return{snr:n,pd:r}}/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Yo="173",zh=0,wc=1,Gh=2,Yl=1,Vh=2,Cn=3,Qn=0,Zt=1,bt=2,Kn=0,Xi=1,Rc=2,Cc=3,Pc=4,Hh=5,hi=100,Wh=101,Xh=102,Yh=103,qh=104,Zh=200,$h=201,Kh=202,jh=203,Za=204,$a=205,Jh=206,Qh=207,ed=208,td=209,nd=210,id=211,rd=212,sd=213,ad=214,Ka=0,ja=1,Ja=2,er=3,Qa=4,eo=5,to=6,no=7,ql=0,od=1,cd=2,jn=0,ld=1,ud=2,hd=3,dd=4,fd=5,pd=6,md=7,Zl=300,tr=301,nr=302,io=303,ro=304,Vs=306,so=1e3,fi=1001,ao=1002,pn=1003,gd=1004,Hr=1005,qt=1006,Js=1007,pi=1008,Un=1009,$l=1010,Kl=1011,Lr=1012,qo=1013,gi=1014,Ln=1015,Or=1016,Zo=1017,$o=1018,ir=1020,jl=35902,Jl=1021,Ql=1022,fn=1023,eu=1024,tu=1025,Yi=1026,rr=1027,nu=1028,Ko=1029,iu=1030,jo=1031,Jo=1033,Ss=33776,Es=33777,Ts=33778,bs=33779,oo=35840,co=35841,lo=35842,uo=35843,ho=36196,fo=37492,po=37496,mo=37808,go=37809,_o=37810,vo=37811,xo=37812,Mo=37813,yo=37814,So=37815,Eo=37816,To=37817,bo=37818,Ao=37819,wo=37820,Ro=37821,As=36492,Co=36494,Po=36495,ru=36283,Lo=36284,Io=36285,Do=36286,_d=3200,vd=3201,xd=0,Md=1,qn="",nn="srgb",sr="srgb-linear",Ns="linear",pt="srgb",Si=7680,Lc=519,yd=512,Sd=513,Ed=514,su=515,Td=516,bd=517,Ad=518,wd=519,No=35044,Ic="300 es",In=2e3,Us=2001;class cr{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const r=n[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const r=n.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,e);e.target=null}}}const Ft=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Dc=1234567;const qi=Math.PI/180,Ir=180/Math.PI;function xn(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ft[i&255]+Ft[i>>8&255]+Ft[i>>16&255]+Ft[i>>24&255]+"-"+Ft[e&255]+Ft[e>>8&255]+"-"+Ft[e>>16&15|64]+Ft[e>>24&255]+"-"+Ft[t&63|128]+Ft[t>>8&255]+"-"+Ft[t>>16&255]+Ft[t>>24&255]+Ft[n&255]+Ft[n>>8&255]+Ft[n>>16&255]+Ft[n>>24&255]).toLowerCase()}function Ye(i,e,t){return Math.max(e,Math.min(t,i))}function Qo(i,e){return(i%e+e)%e}function Rd(i,e,t,n,r){return n+(i-e)*(r-n)/(t-e)}function Cd(i,e,t){return i!==e?(t-i)/(e-i):0}function Er(i,e,t){return(1-t)*i+t*e}function Pd(i,e,t,n){return Er(i,e,1-Math.exp(-t*n))}function Ld(i,e=1){return e-Math.abs(Qo(i,e*2)-e)}function Id(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Dd(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Nd(i,e){return i+Math.floor(Math.random()*(e-i+1))}function Ud(i,e){return i+Math.random()*(e-i)}function Fd(i){return i*(.5-Math.random())}function Od(i){i!==void 0&&(Dc=i);let e=Dc+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function kd(i){return i*qi}function Bd(i){return i*Ir}function zd(i){return(i&i-1)===0&&i!==0}function Gd(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Vd(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Hd(i,e,t,n,r){const s=Math.cos,a=Math.sin,o=s(t/2),c=a(t/2),l=s((e+n)/2),u=a((e+n)/2),h=s((e-n)/2),d=a((e-n)/2),f=s((n-e)/2),g=a((n-e)/2);switch(r){case"XYX":i.set(o*u,c*h,c*d,o*l);break;case"YZY":i.set(c*d,o*u,c*h,o*l);break;case"ZXZ":i.set(c*h,c*d,o*u,o*l);break;case"XZX":i.set(o*u,c*g,c*f,o*l);break;case"YXY":i.set(c*f,o*u,c*g,o*l);break;case"ZYZ":i.set(c*g,c*f,o*u,o*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function dn(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function ht(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const au={DEG2RAD:qi,RAD2DEG:Ir,generateUUID:xn,clamp:Ye,euclideanModulo:Qo,mapLinear:Rd,inverseLerp:Cd,lerp:Er,damp:Pd,pingpong:Ld,smoothstep:Id,smootherstep:Dd,randInt:Nd,randFloat:Ud,randFloatSpread:Fd,seededRandom:Od,degToRad:kd,radToDeg:Bd,isPowerOfTwo:zd,ceilPowerOfTwo:Gd,floorPowerOfTwo:Vd,setQuaternionFromProperEuler:Hd,normalize:ht,denormalize:dn};class le{constructor(e=0,t=0){le.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ye(this.x,e.x,t.x),this.y=Ye(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ye(this.x,e,t),this.y=Ye(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ye(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ye(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*n-a*r+e.x,this.y=s*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class He{constructor(e,t,n,r,s,a,o,c,l){He.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,c,l)}set(e,t,n,r,s,a,o,c,l){const u=this.elements;return u[0]=e,u[1]=r,u[2]=o,u[3]=t,u[4]=s,u[5]=c,u[6]=n,u[7]=a,u[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],u=n[4],h=n[7],d=n[2],f=n[5],g=n[8],_=r[0],m=r[3],p=r[6],T=r[1],y=r[4],v=r[7],L=r[2],R=r[5],C=r[8];return s[0]=a*_+o*T+c*L,s[3]=a*m+o*y+c*R,s[6]=a*p+o*v+c*C,s[1]=l*_+u*T+h*L,s[4]=l*m+u*y+h*R,s[7]=l*p+u*v+h*C,s[2]=d*_+f*T+g*L,s[5]=d*m+f*y+g*R,s[8]=d*p+f*v+g*C,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],u=e[8];return t*a*u-t*o*l-n*s*u+n*o*c+r*s*l-r*a*c}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],u=e[8],h=u*a-o*l,d=o*c-u*s,f=l*s-a*c,g=t*h+n*d+r*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return e[0]=h*_,e[1]=(r*l-u*n)*_,e[2]=(o*n-r*a)*_,e[3]=d*_,e[4]=(u*t-r*c)*_,e[5]=(r*s-o*t)*_,e[6]=f*_,e[7]=(n*c-l*t)*_,e[8]=(a*t-n*s)*_,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,s,a,o){const c=Math.cos(s),l=Math.sin(s);return this.set(n*c,n*l,-n*(c*a+l*o)+a+e,-r*l,r*c,-r*(-l*a+c*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Qs.makeScale(e,t)),this}rotate(e){return this.premultiply(Qs.makeRotation(-e)),this}translate(e,t){return this.premultiply(Qs.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<9;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Qs=new He;function ou(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Fs(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Wd(){const i=Fs("canvas");return i.style.display="block",i}const Nc={};function Vi(i){i in Nc||(Nc[i]=!0,console.warn(i))}function Xd(i,e,t){return new Promise(function(n,r){function s(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:r();break;case i.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}function Yd(i){const e=i.elements;e[2]=.5*e[2]+.5*e[3],e[6]=.5*e[6]+.5*e[7],e[10]=.5*e[10]+.5*e[11],e[14]=.5*e[14]+.5*e[15]}function qd(i){const e=i.elements;e[11]===-1?(e[10]=-e[10]-1,e[14]=-e[14]):(e[10]=-e[10],e[14]=-e[14]+1)}const Uc=new He().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Fc=new He().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Zd(){const i={enabled:!0,workingColorSpace:sr,spaces:{},convert:function(r,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer===pt&&(r.r=Dn(r.r),r.g=Dn(r.g),r.b=Dn(r.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===pt&&(r.r=Zi(r.r),r.g=Zi(r.g),r.b=Zi(r.b))),r},fromWorkingColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},toWorkingColorSpace:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===qn?Ns:this.spaces[r].transfer},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,a){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[sr]:{primaries:e,whitePoint:n,transfer:Ns,toXYZ:Uc,fromXYZ:Fc,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:nn},outputColorSpaceConfig:{drawingBufferColorSpace:nn}},[nn]:{primaries:e,whitePoint:n,transfer:pt,toXYZ:Uc,fromXYZ:Fc,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:nn}}}),i}const st=Zd();function Dn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Zi(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Ei;class $d{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Ei===void 0&&(Ei=Fs("canvas")),Ei.width=e.width,Ei.height=e.height;const n=Ei.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),t=Ei}return t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Fs("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const r=n.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=Dn(s[a]/255)*255;return n.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Dn(t[n]/255)*255):t[n]=Dn(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Kd=0;class cu{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Kd++}),this.uuid=xn(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(ea(r[a].image)):s.push(ea(r[a]))}else s=ea(r);n.url=s}return t||(e.images[this.uuid]=n),n}}function ea(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?$d.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let jd=0;class Nt extends cr{constructor(e=Nt.DEFAULT_IMAGE,t=Nt.DEFAULT_MAPPING,n=fi,r=fi,s=qt,a=pi,o=fn,c=Un,l=Nt.DEFAULT_ANISOTROPY,u=qn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:jd++}),this.uuid=xn(),this.name="",this.source=new cu(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new le(0,0),this.repeat=new le(1,1),this.center=new le(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new He,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Zl)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case so:e.x=e.x-Math.floor(e.x);break;case fi:e.x=e.x<0?0:1;break;case ao:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case so:e.y=e.y-Math.floor(e.y);break;case fi:e.y=e.y<0?0:1;break;case ao:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Nt.DEFAULT_IMAGE=null;Nt.DEFAULT_MAPPING=Zl;Nt.DEFAULT_ANISOTROPY=1;class At{constructor(e=0,t=0,n=0,r=1){At.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,s;const c=e.elements,l=c[0],u=c[4],h=c[8],d=c[1],f=c[5],g=c[9],_=c[2],m=c[6],p=c[10];if(Math.abs(u-d)<.01&&Math.abs(h-_)<.01&&Math.abs(g-m)<.01){if(Math.abs(u+d)<.1&&Math.abs(h+_)<.1&&Math.abs(g+m)<.1&&Math.abs(l+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const y=(l+1)/2,v=(f+1)/2,L=(p+1)/2,R=(u+d)/4,C=(h+_)/4,I=(g+m)/4;return y>v&&y>L?y<.01?(n=0,r=.707106781,s=.707106781):(n=Math.sqrt(y),r=R/n,s=C/n):v>L?v<.01?(n=.707106781,r=0,s=.707106781):(r=Math.sqrt(v),n=R/r,s=I/r):L<.01?(n=.707106781,r=.707106781,s=0):(s=Math.sqrt(L),n=C/s,r=I/s),this.set(n,r,s,t),this}let T=Math.sqrt((m-g)*(m-g)+(h-_)*(h-_)+(d-u)*(d-u));return Math.abs(T)<.001&&(T=1),this.x=(m-g)/T,this.y=(h-_)/T,this.z=(d-u)/T,this.w=Math.acos((l+f+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ye(this.x,e.x,t.x),this.y=Ye(this.y,e.y,t.y),this.z=Ye(this.z,e.z,t.z),this.w=Ye(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ye(this.x,e,t),this.y=Ye(this.y,e,t),this.z=Ye(this.z,e,t),this.w=Ye(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ye(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Jd extends cr{constructor(e=1,t=1,n={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new At(0,0,e,t),this.scissorTest=!1,this.viewport=new At(0,0,e,t);const r={width:e,height:t,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:qt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);const s=new Nt(r,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);s.flipY=!1,s.generateMipmaps=n.generateMipmaps,s.internalFormat=n.internalFormat,this.textures=[];const a=n.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let n=0,r=e.textures.length;n<r;n++)this.textures[n]=e.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0,this.textures[n].renderTarget=this;const t=Object.assign({},e.texture.image);return this.texture.source=new cu(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class _i extends Jd{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class lu extends Nt{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=pn,this.minFilter=pn,this.wrapR=fi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Qd extends Nt{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=pn,this.minFilter=pn,this.wrapR=fi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class kr{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,s,a,o){let c=n[r+0],l=n[r+1],u=n[r+2],h=n[r+3];const d=s[a+0],f=s[a+1],g=s[a+2],_=s[a+3];if(o===0){e[t+0]=c,e[t+1]=l,e[t+2]=u,e[t+3]=h;return}if(o===1){e[t+0]=d,e[t+1]=f,e[t+2]=g,e[t+3]=_;return}if(h!==_||c!==d||l!==f||u!==g){let m=1-o;const p=c*d+l*f+u*g+h*_,T=p>=0?1:-1,y=1-p*p;if(y>Number.EPSILON){const L=Math.sqrt(y),R=Math.atan2(L,p*T);m=Math.sin(m*R)/L,o=Math.sin(o*R)/L}const v=o*T;if(c=c*m+d*v,l=l*m+f*v,u=u*m+g*v,h=h*m+_*v,m===1-o){const L=1/Math.sqrt(c*c+l*l+u*u+h*h);c*=L,l*=L,u*=L,h*=L}}e[t]=c,e[t+1]=l,e[t+2]=u,e[t+3]=h}static multiplyQuaternionsFlat(e,t,n,r,s,a){const o=n[r],c=n[r+1],l=n[r+2],u=n[r+3],h=s[a],d=s[a+1],f=s[a+2],g=s[a+3];return e[t]=o*g+u*h+c*f-l*d,e[t+1]=c*g+u*d+l*h-o*f,e[t+2]=l*g+u*f+o*d-c*h,e[t+3]=u*g-o*h-c*d-l*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,r=e._y,s=e._z,a=e._order,o=Math.cos,c=Math.sin,l=o(n/2),u=o(r/2),h=o(s/2),d=c(n/2),f=c(r/2),g=c(s/2);switch(a){case"XYZ":this._x=d*u*h+l*f*g,this._y=l*f*h-d*u*g,this._z=l*u*g+d*f*h,this._w=l*u*h-d*f*g;break;case"YXZ":this._x=d*u*h+l*f*g,this._y=l*f*h-d*u*g,this._z=l*u*g-d*f*h,this._w=l*u*h+d*f*g;break;case"ZXY":this._x=d*u*h-l*f*g,this._y=l*f*h+d*u*g,this._z=l*u*g+d*f*h,this._w=l*u*h-d*f*g;break;case"ZYX":this._x=d*u*h-l*f*g,this._y=l*f*h+d*u*g,this._z=l*u*g-d*f*h,this._w=l*u*h+d*f*g;break;case"YZX":this._x=d*u*h+l*f*g,this._y=l*f*h+d*u*g,this._z=l*u*g-d*f*h,this._w=l*u*h-d*f*g;break;case"XZY":this._x=d*u*h-l*f*g,this._y=l*f*h-d*u*g,this._z=l*u*g+d*f*h,this._w=l*u*h+d*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],r=t[4],s=t[8],a=t[1],o=t[5],c=t[9],l=t[2],u=t[6],h=t[10],d=n+o+h;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(u-c)*f,this._y=(s-l)*f,this._z=(a-r)*f}else if(n>o&&n>h){const f=2*Math.sqrt(1+n-o-h);this._w=(u-c)/f,this._x=.25*f,this._y=(r+a)/f,this._z=(s+l)/f}else if(o>h){const f=2*Math.sqrt(1+o-n-h);this._w=(s-l)/f,this._x=(r+a)/f,this._y=.25*f,this._z=(c+u)/f}else{const f=2*Math.sqrt(1+h-n-o);this._w=(a-r)/f,this._x=(s+l)/f,this._y=(c+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<Number.EPSILON?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ye(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,r=e._y,s=e._z,a=e._w,o=t._x,c=t._y,l=t._z,u=t._w;return this._x=n*u+a*o+r*l-s*c,this._y=r*u+a*c+s*o-n*l,this._z=s*u+a*l+n*c-r*o,this._w=a*u-n*o-r*c-s*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,r=this._y,s=this._z,a=this._w;let o=a*e._w+n*e._x+r*e._y+s*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=r,this._z=s,this;const c=1-o*o;if(c<=Number.EPSILON){const f=1-t;return this._w=f*a+t*this._w,this._x=f*n+t*this._x,this._y=f*r+t*this._y,this._z=f*s+t*this._z,this.normalize(),this}const l=Math.sqrt(c),u=Math.atan2(l,o),h=Math.sin((1-t)*u)/l,d=Math.sin(t*u)/l;return this._w=a*h+this._w*d,this._x=n*h+this._x*d,this._y=r*h+this._y*d,this._z=s*h+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class w{constructor(e=0,t=0,n=0){w.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Oc.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Oc.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*r,this.y=s[1]*t+s[4]*n+s[7]*r,this.z=s[2]*t+s[5]*n+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*n+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*n+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*n+s[10]*r+s[14])*a,this}applyQuaternion(e){const t=this.x,n=this.y,r=this.z,s=e.x,a=e.y,o=e.z,c=e.w,l=2*(a*r-o*n),u=2*(o*t-s*r),h=2*(s*n-a*t);return this.x=t+c*l+a*h-o*u,this.y=n+c*u+o*l-s*h,this.z=r+c*h+s*u-a*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*r,this.y=s[1]*t+s[5]*n+s[9]*r,this.z=s[2]*t+s[6]*n+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ye(this.x,e.x,t.x),this.y=Ye(this.y,e.y,t.y),this.z=Ye(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ye(this.x,e,t),this.y=Ye(this.y,e,t),this.z=Ye(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Ye(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,r=e.y,s=e.z,a=t.x,o=t.y,c=t.z;return this.x=r*c-s*o,this.y=s*a-n*c,this.z=n*o-r*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return ta.copy(this).projectOnVector(e),this.sub(ta)}reflect(e){return this.sub(ta.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ye(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const ta=new w,Oc=new kr;class Br{constructor(e=new w(1/0,1/0,1/0),t=new w(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(ln.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(ln.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=ln.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,ln):ln.fromBufferAttribute(s,a),ln.applyMatrix4(e.matrixWorld),this.expandByPoint(ln);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Wr.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Wr.copy(n.boundingBox)),Wr.applyMatrix4(e.matrixWorld),this.union(Wr)}const r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,ln),ln.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(dr),Xr.subVectors(this.max,dr),Ti.subVectors(e.a,dr),bi.subVectors(e.b,dr),Ai.subVectors(e.c,dr),kn.subVectors(bi,Ti),Bn.subVectors(Ai,bi),ii.subVectors(Ti,Ai);let t=[0,-kn.z,kn.y,0,-Bn.z,Bn.y,0,-ii.z,ii.y,kn.z,0,-kn.x,Bn.z,0,-Bn.x,ii.z,0,-ii.x,-kn.y,kn.x,0,-Bn.y,Bn.x,0,-ii.y,ii.x,0];return!na(t,Ti,bi,Ai,Xr)||(t=[1,0,0,0,1,0,0,0,1],!na(t,Ti,bi,Ai,Xr))?!1:(Yr.crossVectors(kn,Bn),t=[Yr.x,Yr.y,Yr.z],na(t,Ti,bi,Ai,Xr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,ln).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(ln).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Tn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Tn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Tn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Tn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Tn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Tn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Tn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Tn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Tn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const Tn=[new w,new w,new w,new w,new w,new w,new w,new w],ln=new w,Wr=new Br,Ti=new w,bi=new w,Ai=new w,kn=new w,Bn=new w,ii=new w,dr=new w,Xr=new w,Yr=new w,ri=new w;function na(i,e,t,n,r){for(let s=0,a=i.length-3;s<=a;s+=3){ri.fromArray(i,s);const o=r.x*Math.abs(ri.x)+r.y*Math.abs(ri.y)+r.z*Math.abs(ri.z),c=e.dot(ri),l=t.dot(ri),u=n.dot(ri);if(Math.max(-Math.max(c,l,u),Math.min(c,l,u))>o)return!1}return!0}const ef=new Br,fr=new w,ia=new w;class Hs{constructor(e=new w,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):ef.setFromPoints(e).getCenter(n);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;fr.subVectors(e,this.center);const t=fr.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),r=(n-this.radius)*.5;this.center.addScaledVector(fr,r/n),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(ia.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(fr.copy(e.center).add(ia)),this.expandByPoint(fr.copy(e.center).sub(ia))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const bn=new w,ra=new w,qr=new w,zn=new w,sa=new w,Zr=new w,aa=new w;class uu{constructor(e=new w,t=new w(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,bn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=bn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(bn.copy(this.origin).addScaledVector(this.direction,t),bn.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){ra.copy(e).add(t).multiplyScalar(.5),qr.copy(t).sub(e).normalize(),zn.copy(this.origin).sub(ra);const s=e.distanceTo(t)*.5,a=-this.direction.dot(qr),o=zn.dot(this.direction),c=-zn.dot(qr),l=zn.lengthSq(),u=Math.abs(1-a*a);let h,d,f,g;if(u>0)if(h=a*c-o,d=a*o-c,g=s*u,h>=0)if(d>=-g)if(d<=g){const _=1/u;h*=_,d*=_,f=h*(h+a*d+2*o)+d*(a*h+d+2*c)+l}else d=s,h=Math.max(0,-(a*d+o)),f=-h*h+d*(d+2*c)+l;else d=-s,h=Math.max(0,-(a*d+o)),f=-h*h+d*(d+2*c)+l;else d<=-g?(h=Math.max(0,-(-a*s+o)),d=h>0?-s:Math.min(Math.max(-s,-c),s),f=-h*h+d*(d+2*c)+l):d<=g?(h=0,d=Math.min(Math.max(-s,-c),s),f=d*(d+2*c)+l):(h=Math.max(0,-(a*s+o)),d=h>0?s:Math.min(Math.max(-s,-c),s),f=-h*h+d*(d+2*c)+l);else d=a>0?-s:s,h=Math.max(0,-(a*d+o)),f=-h*h+d*(d+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,h),r&&r.copy(ra).addScaledVector(qr,d),f}intersectSphere(e,t){bn.subVectors(e.center,this.origin);const n=bn.dot(this.direction),r=bn.dot(bn)-n*n,s=e.radius*e.radius;if(r>s)return null;const a=Math.sqrt(s-r),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,s,a,o,c;const l=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,d=this.origin;return l>=0?(n=(e.min.x-d.x)*l,r=(e.max.x-d.x)*l):(n=(e.max.x-d.x)*l,r=(e.min.x-d.x)*l),u>=0?(s=(e.min.y-d.y)*u,a=(e.max.y-d.y)*u):(s=(e.max.y-d.y)*u,a=(e.min.y-d.y)*u),n>a||s>r||((s>n||isNaN(n))&&(n=s),(a<r||isNaN(r))&&(r=a),h>=0?(o=(e.min.z-d.z)*h,c=(e.max.z-d.z)*h):(o=(e.max.z-d.z)*h,c=(e.min.z-d.z)*h),n>c||o>r)||((o>n||n!==n)&&(n=o),(c<r||r!==r)&&(r=c),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,bn)!==null}intersectTriangle(e,t,n,r,s){sa.subVectors(t,e),Zr.subVectors(n,e),aa.crossVectors(sa,Zr);let a=this.direction.dot(aa),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;zn.subVectors(this.origin,e);const c=o*this.direction.dot(Zr.crossVectors(zn,Zr));if(c<0)return null;const l=o*this.direction.dot(sa.cross(zn));if(l<0||c+l>a)return null;const u=-o*zn.dot(aa);return u<0?null:this.at(u/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class St{constructor(e,t,n,r,s,a,o,c,l,u,h,d,f,g,_,m){St.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,c,l,u,h,d,f,g,_,m)}set(e,t,n,r,s,a,o,c,l,u,h,d,f,g,_,m){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=r,p[1]=s,p[5]=a,p[9]=o,p[13]=c,p[2]=l,p[6]=u,p[10]=h,p[14]=d,p[3]=f,p[7]=g,p[11]=_,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new St().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,r=1/wi.setFromMatrixColumn(e,0).length(),s=1/wi.setFromMatrixColumn(e,1).length(),a=1/wi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,r=e.y,s=e.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(r),l=Math.sin(r),u=Math.cos(s),h=Math.sin(s);if(e.order==="XYZ"){const d=a*u,f=a*h,g=o*u,_=o*h;t[0]=c*u,t[4]=-c*h,t[8]=l,t[1]=f+g*l,t[5]=d-_*l,t[9]=-o*c,t[2]=_-d*l,t[6]=g+f*l,t[10]=a*c}else if(e.order==="YXZ"){const d=c*u,f=c*h,g=l*u,_=l*h;t[0]=d+_*o,t[4]=g*o-f,t[8]=a*l,t[1]=a*h,t[5]=a*u,t[9]=-o,t[2]=f*o-g,t[6]=_+d*o,t[10]=a*c}else if(e.order==="ZXY"){const d=c*u,f=c*h,g=l*u,_=l*h;t[0]=d-_*o,t[4]=-a*h,t[8]=g+f*o,t[1]=f+g*o,t[5]=a*u,t[9]=_-d*o,t[2]=-a*l,t[6]=o,t[10]=a*c}else if(e.order==="ZYX"){const d=a*u,f=a*h,g=o*u,_=o*h;t[0]=c*u,t[4]=g*l-f,t[8]=d*l+_,t[1]=c*h,t[5]=_*l+d,t[9]=f*l-g,t[2]=-l,t[6]=o*c,t[10]=a*c}else if(e.order==="YZX"){const d=a*c,f=a*l,g=o*c,_=o*l;t[0]=c*u,t[4]=_-d*h,t[8]=g*h+f,t[1]=h,t[5]=a*u,t[9]=-o*u,t[2]=-l*u,t[6]=f*h+g,t[10]=d-_*h}else if(e.order==="XZY"){const d=a*c,f=a*l,g=o*c,_=o*l;t[0]=c*u,t[4]=-h,t[8]=l*u,t[1]=d*h+_,t[5]=a*u,t[9]=f*h-g,t[2]=g*h-f,t[6]=o*u,t[10]=_*h+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(tf,e,nf)}lookAt(e,t,n){const r=this.elements;return Kt.subVectors(e,t),Kt.lengthSq()===0&&(Kt.z=1),Kt.normalize(),Gn.crossVectors(n,Kt),Gn.lengthSq()===0&&(Math.abs(n.z)===1?Kt.x+=1e-4:Kt.z+=1e-4,Kt.normalize(),Gn.crossVectors(n,Kt)),Gn.normalize(),$r.crossVectors(Kt,Gn),r[0]=Gn.x,r[4]=$r.x,r[8]=Kt.x,r[1]=Gn.y,r[5]=$r.y,r[9]=Kt.y,r[2]=Gn.z,r[6]=$r.z,r[10]=Kt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],u=n[1],h=n[5],d=n[9],f=n[13],g=n[2],_=n[6],m=n[10],p=n[14],T=n[3],y=n[7],v=n[11],L=n[15],R=r[0],C=r[4],I=r[8],E=r[12],x=r[1],P=r[5],z=r[9],U=r[13],B=r[2],X=r[6],G=r[10],K=r[14],O=r[3],J=r[7],se=r[11],ve=r[15];return s[0]=a*R+o*x+c*B+l*O,s[4]=a*C+o*P+c*X+l*J,s[8]=a*I+o*z+c*G+l*se,s[12]=a*E+o*U+c*K+l*ve,s[1]=u*R+h*x+d*B+f*O,s[5]=u*C+h*P+d*X+f*J,s[9]=u*I+h*z+d*G+f*se,s[13]=u*E+h*U+d*K+f*ve,s[2]=g*R+_*x+m*B+p*O,s[6]=g*C+_*P+m*X+p*J,s[10]=g*I+_*z+m*G+p*se,s[14]=g*E+_*U+m*K+p*ve,s[3]=T*R+y*x+v*B+L*O,s[7]=T*C+y*P+v*X+L*J,s[11]=T*I+y*z+v*G+L*se,s[15]=T*E+y*U+v*K+L*ve,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],r=e[8],s=e[12],a=e[1],o=e[5],c=e[9],l=e[13],u=e[2],h=e[6],d=e[10],f=e[14],g=e[3],_=e[7],m=e[11],p=e[15];return g*(+s*c*h-r*l*h-s*o*d+n*l*d+r*o*f-n*c*f)+_*(+t*c*f-t*l*d+s*a*d-r*a*f+r*l*u-s*c*u)+m*(+t*l*h-t*o*f-s*a*h+n*a*f+s*o*u-n*l*u)+p*(-r*o*u-t*c*h+t*o*d+r*a*h-n*a*d+n*c*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],u=e[8],h=e[9],d=e[10],f=e[11],g=e[12],_=e[13],m=e[14],p=e[15],T=h*m*l-_*d*l+_*c*f-o*m*f-h*c*p+o*d*p,y=g*d*l-u*m*l-g*c*f+a*m*f+u*c*p-a*d*p,v=u*_*l-g*h*l+g*o*f-a*_*f-u*o*p+a*h*p,L=g*h*c-u*_*c-g*o*d+a*_*d+u*o*m-a*h*m,R=t*T+n*y+r*v+s*L;if(R===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const C=1/R;return e[0]=T*C,e[1]=(_*d*s-h*m*s-_*r*f+n*m*f+h*r*p-n*d*p)*C,e[2]=(o*m*s-_*c*s+_*r*l-n*m*l-o*r*p+n*c*p)*C,e[3]=(h*c*s-o*d*s-h*r*l+n*d*l+o*r*f-n*c*f)*C,e[4]=y*C,e[5]=(u*m*s-g*d*s+g*r*f-t*m*f-u*r*p+t*d*p)*C,e[6]=(g*c*s-a*m*s-g*r*l+t*m*l+a*r*p-t*c*p)*C,e[7]=(a*d*s-u*c*s+u*r*l-t*d*l-a*r*f+t*c*f)*C,e[8]=v*C,e[9]=(g*h*s-u*_*s-g*n*f+t*_*f+u*n*p-t*h*p)*C,e[10]=(a*_*s-g*o*s+g*n*l-t*_*l-a*n*p+t*o*p)*C,e[11]=(u*o*s-a*h*s-u*n*l+t*h*l+a*n*f-t*o*f)*C,e[12]=L*C,e[13]=(u*_*r-g*h*r+g*n*d-t*_*d-u*n*m+t*h*m)*C,e[14]=(g*o*r-a*_*r-g*n*c+t*_*c+a*n*m-t*o*m)*C,e[15]=(a*h*r-u*o*r+u*n*c-t*h*c-a*n*d+t*o*d)*C,this}scale(e){const t=this.elements,n=e.x,r=e.y,s=e.z;return t[0]*=n,t[4]*=r,t[8]*=s,t[1]*=n,t[5]*=r,t[9]*=s,t[2]*=n,t[6]*=r,t[10]*=s,t[3]*=n,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),r=Math.sin(t),s=1-n,a=e.x,o=e.y,c=e.z,l=s*a,u=s*o;return this.set(l*a+n,l*o-r*c,l*c+r*o,0,l*o+r*c,u*o+n,u*c-r*a,0,l*c-r*o,u*c+r*a,s*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,s,a){return this.set(1,n,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){const r=this.elements,s=t._x,a=t._y,o=t._z,c=t._w,l=s+s,u=a+a,h=o+o,d=s*l,f=s*u,g=s*h,_=a*u,m=a*h,p=o*h,T=c*l,y=c*u,v=c*h,L=n.x,R=n.y,C=n.z;return r[0]=(1-(_+p))*L,r[1]=(f+v)*L,r[2]=(g-y)*L,r[3]=0,r[4]=(f-v)*R,r[5]=(1-(d+p))*R,r[6]=(m+T)*R,r[7]=0,r[8]=(g+y)*C,r[9]=(m-T)*C,r[10]=(1-(d+_))*C,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){const r=this.elements;let s=wi.set(r[0],r[1],r[2]).length();const a=wi.set(r[4],r[5],r[6]).length(),o=wi.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],un.copy(this);const l=1/s,u=1/a,h=1/o;return un.elements[0]*=l,un.elements[1]*=l,un.elements[2]*=l,un.elements[4]*=u,un.elements[5]*=u,un.elements[6]*=u,un.elements[8]*=h,un.elements[9]*=h,un.elements[10]*=h,t.setFromRotationMatrix(un),n.x=s,n.y=a,n.z=o,this}makePerspective(e,t,n,r,s,a,o=In){const c=this.elements,l=2*s/(t-e),u=2*s/(n-r),h=(t+e)/(t-e),d=(n+r)/(n-r);let f,g;if(o===In)f=-(a+s)/(a-s),g=-2*a*s/(a-s);else if(o===Us)f=-a/(a-s),g=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=l,c[4]=0,c[8]=h,c[12]=0,c[1]=0,c[5]=u,c[9]=d,c[13]=0,c[2]=0,c[6]=0,c[10]=f,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,s,a,o=In){const c=this.elements,l=1/(t-e),u=1/(n-r),h=1/(a-s),d=(t+e)*l,f=(n+r)*u;let g,_;if(o===In)g=(a+s)*h,_=-2*h;else if(o===Us)g=s*h,_=-1*h;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-d,c[1]=0,c[5]=2*u,c[9]=0,c[13]=-f,c[2]=0,c[6]=0,c[10]=_,c[14]=-g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<16;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const wi=new w,un=new St,tf=new w(0,0,0),nf=new w(1,1,1),Gn=new w,$r=new w,Kt=new w,kc=new St,Bc=new kr;class Fn{constructor(e=0,t=0,n=0,r=Fn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const r=e.elements,s=r[0],a=r[4],o=r[8],c=r[1],l=r[5],u=r[9],h=r[2],d=r[6],f=r[10];switch(t){case"XYZ":this._y=Math.asin(Ye(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(d,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Ye(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(Ye(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-h,f),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-Ye(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(Ye(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-u,l),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Ye(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,l),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-u,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return kc.makeRotationFromQuaternion(e),this.setFromRotationMatrix(kc,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Bc.setFromEuler(this),this.setFromQuaternion(Bc,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Fn.DEFAULT_ORDER="XYZ";class hu{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let rf=0;const zc=new w,Ri=new kr,An=new St,Kr=new w,pr=new w,sf=new w,af=new kr,Gc=new w(1,0,0),Vc=new w(0,1,0),Hc=new w(0,0,1),Wc={type:"added"},of={type:"removed"},Ci={type:"childadded",child:null},oa={type:"childremoved",child:null};class Vt extends cr{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:rf++}),this.uuid=xn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Vt.DEFAULT_UP.clone();const e=new w,t=new Fn,n=new kr,r=new w(1,1,1);function s(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new St},normalMatrix:{value:new He}}),this.matrix=new St,this.matrixWorld=new St,this.matrixAutoUpdate=Vt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Vt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new hu,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ri.setFromAxisAngle(e,t),this.quaternion.multiply(Ri),this}rotateOnWorldAxis(e,t){return Ri.setFromAxisAngle(e,t),this.quaternion.premultiply(Ri),this}rotateX(e){return this.rotateOnAxis(Gc,e)}rotateY(e){return this.rotateOnAxis(Vc,e)}rotateZ(e){return this.rotateOnAxis(Hc,e)}translateOnAxis(e,t){return zc.copy(e).applyQuaternion(this.quaternion),this.position.add(zc.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Gc,e)}translateY(e){return this.translateOnAxis(Vc,e)}translateZ(e){return this.translateOnAxis(Hc,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(An.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Kr.copy(e):Kr.set(e,t,n);const r=this.parent;this.updateWorldMatrix(!0,!1),pr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?An.lookAt(pr,Kr,this.up):An.lookAt(Kr,pr,this.up),this.quaternion.setFromRotationMatrix(An),r&&(An.extractRotation(r.matrixWorld),Ri.setFromRotationMatrix(An),this.quaternion.premultiply(Ri.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Wc),Ci.child=e,this.dispatchEvent(Ci),Ci.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(of),oa.child=e,this.dispatchEvent(oa),oa.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),An.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),An.multiply(e.parent.matrixWorld)),e.applyMatrix4(An),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Wc),Ci.child=e,this.dispatchEvent(Ci),Ci.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){const a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pr,e,sf),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(pr,af,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function s(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const c=o.shapes;if(Array.isArray(c))for(let l=0,u=c.length;l<u;l++){const h=c[l];s(e.shapes,h)}else s(e.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(s(e.materials,this.material[c]));r.material=o}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const c=this.animations[o];r.animations.push(s(e.animations,c))}}if(t){const o=a(e.geometries),c=a(e.materials),l=a(e.textures),u=a(e.images),h=a(e.shapes),d=a(e.skeletons),f=a(e.animations),g=a(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),u.length>0&&(n.images=u),h.length>0&&(n.shapes=h),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=r,n;function a(o){const c=[];for(const l in o){const u=o[l];delete u.metadata,c.push(u)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const r=e.children[n];this.add(r.clone())}return this}}Vt.DEFAULT_UP=new w(0,1,0);Vt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Vt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const hn=new w,wn=new w,ca=new w,Rn=new w,Pi=new w,Li=new w,Xc=new w,la=new w,ua=new w,ha=new w,da=new At,fa=new At,pa=new At;class Jt{constructor(e=new w,t=new w,n=new w){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),hn.subVectors(e,t),r.cross(hn);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,n,r,s){hn.subVectors(r,t),wn.subVectors(n,t),ca.subVectors(e,t);const a=hn.dot(hn),o=hn.dot(wn),c=hn.dot(ca),l=wn.dot(wn),u=wn.dot(ca),h=a*l-o*o;if(h===0)return s.set(0,0,0),null;const d=1/h,f=(l*c-o*u)*d,g=(a*u-o*c)*d;return s.set(1-f-g,g,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,Rn)===null?!1:Rn.x>=0&&Rn.y>=0&&Rn.x+Rn.y<=1}static getInterpolation(e,t,n,r,s,a,o,c){return this.getBarycoord(e,t,n,r,Rn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,Rn.x),c.addScaledVector(a,Rn.y),c.addScaledVector(o,Rn.z),c)}static getInterpolatedAttribute(e,t,n,r,s,a){return da.setScalar(0),fa.setScalar(0),pa.setScalar(0),da.fromBufferAttribute(e,t),fa.fromBufferAttribute(e,n),pa.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(da,s.x),a.addScaledVector(fa,s.y),a.addScaledVector(pa,s.z),a}static isFrontFacing(e,t,n,r){return hn.subVectors(n,t),wn.subVectors(e,t),hn.cross(wn).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return hn.subVectors(this.c,this.b),wn.subVectors(this.a,this.b),hn.cross(wn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Jt.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Jt.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,r,s){return Jt.getInterpolation(e,this.a,this.b,this.c,t,n,r,s)}containsPoint(e){return Jt.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Jt.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,r=this.b,s=this.c;let a,o;Pi.subVectors(r,n),Li.subVectors(s,n),la.subVectors(e,n);const c=Pi.dot(la),l=Li.dot(la);if(c<=0&&l<=0)return t.copy(n);ua.subVectors(e,r);const u=Pi.dot(ua),h=Li.dot(ua);if(u>=0&&h<=u)return t.copy(r);const d=c*h-u*l;if(d<=0&&c>=0&&u<=0)return a=c/(c-u),t.copy(n).addScaledVector(Pi,a);ha.subVectors(e,s);const f=Pi.dot(ha),g=Li.dot(ha);if(g>=0&&f<=g)return t.copy(s);const _=f*l-c*g;if(_<=0&&l>=0&&g<=0)return o=l/(l-g),t.copy(n).addScaledVector(Li,o);const m=u*g-f*h;if(m<=0&&h-u>=0&&f-g>=0)return Xc.subVectors(s,r),o=(h-u)/(h-u+(f-g)),t.copy(r).addScaledVector(Xc,o);const p=1/(m+_+d);return a=_*p,o=d*p,t.copy(n).addScaledVector(Pi,a).addScaledVector(Li,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const du={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Vn={h:0,s:0,l:0},jr={h:0,s:0,l:0};function ma(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class tt{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=nn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,st.toWorkingColorSpace(this,t),this}setRGB(e,t,n,r=st.workingColorSpace){return this.r=e,this.g=t,this.b=n,st.toWorkingColorSpace(this,r),this}setHSL(e,t,n,r=st.workingColorSpace){if(e=Qo(e,1),t=Ye(t,0,1),n=Ye(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,a=2*n-s;this.r=ma(a,s,e+1/3),this.g=ma(a,s,e),this.b=ma(a,s,e-1/3)}return st.toWorkingColorSpace(this,r),this}setStyle(e,t=nn){function n(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=nn){const n=du[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Dn(e.r),this.g=Dn(e.g),this.b=Dn(e.b),this}copyLinearToSRGB(e){return this.r=Zi(e.r),this.g=Zi(e.g),this.b=Zi(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=nn){return st.fromWorkingColorSpace(Ot.copy(this),e),Math.round(Ye(Ot.r*255,0,255))*65536+Math.round(Ye(Ot.g*255,0,255))*256+Math.round(Ye(Ot.b*255,0,255))}getHexString(e=nn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=st.workingColorSpace){st.fromWorkingColorSpace(Ot.copy(this),t);const n=Ot.r,r=Ot.g,s=Ot.b,a=Math.max(n,r,s),o=Math.min(n,r,s);let c,l;const u=(o+a)/2;if(o===a)c=0,l=0;else{const h=a-o;switch(l=u<=.5?h/(a+o):h/(2-a-o),a){case n:c=(r-s)/h+(r<s?6:0);break;case r:c=(s-n)/h+2;break;case s:c=(n-r)/h+4;break}c/=6}return e.h=c,e.s=l,e.l=u,e}getRGB(e,t=st.workingColorSpace){return st.fromWorkingColorSpace(Ot.copy(this),t),e.r=Ot.r,e.g=Ot.g,e.b=Ot.b,e}getStyle(e=nn){st.fromWorkingColorSpace(Ot.copy(this),e);const t=Ot.r,n=Ot.g,r=Ot.b;return e!==nn?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(e,t,n){return this.getHSL(Vn),this.setHSL(Vn.h+e,Vn.s+t,Vn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Vn),e.getHSL(jr);const n=Er(Vn.h,jr.h,t),r=Er(Vn.s,jr.s,t),s=Er(Vn.l,jr.l,t);return this.setHSL(n,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*r,this.g=s[1]*t+s[4]*n+s[7]*r,this.b=s[2]*t+s[5]*n+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Ot=new tt;tt.NAMES=du;let cf=0;class lr extends cr{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:cf++}),this.uuid=xn(),this.name="",this.type="Material",this.blending=Xi,this.side=Qn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Za,this.blendDst=$a,this.blendEquation=hi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new tt(0,0,0),this.blendAlpha=0,this.depthFunc=er,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Lc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Si,this.stencilZFail=Si,this.stencilZPass=Si,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Xi&&(n.blending=this.blending),this.side!==Qn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Za&&(n.blendSrc=this.blendSrc),this.blendDst!==$a&&(n.blendDst=this.blendDst),this.blendEquation!==hi&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==er&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Lc&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Si&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Si&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Si&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(s){const a=[];for(const o in s){const c=s[o];delete c.metadata,a.push(c)}return a}if(t){const s=r(e.textures),a=r(e.images);s.length>0&&(n.textures=s),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const r=t.length;n=new Array(r);for(let s=0;s!==r;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class _t extends lr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new tt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Fn,this.combine=ql,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Rt=new w,Jr=new le;let lf=0;class Ht{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:lf++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=No,this.updateRanges=[],this.gpuType=Ln,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Jr.fromBufferAttribute(this,t),Jr.applyMatrix3(e),this.setXY(t,Jr.x,Jr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyMatrix3(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyMatrix4(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyNormalMatrix(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.transformDirection(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=dn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=ht(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=dn(t,this.array)),t}setX(e,t){return this.normalized&&(t=ht(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=dn(t,this.array)),t}setY(e,t){return this.normalized&&(t=ht(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=dn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=ht(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=dn(t,this.array)),t}setW(e,t){return this.normalized&&(t=ht(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=ht(t,this.array),n=ht(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=ht(t,this.array),n=ht(n,this.array),r=ht(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e*=this.itemSize,this.normalized&&(t=ht(t,this.array),n=ht(n,this.array),r=ht(r,this.array),s=ht(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==No&&(e.usage=this.usage),e}}class fu extends Ht{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class pu extends Ht{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class ft extends Ht{constructor(e,t,n){super(new Float32Array(e),t,n)}}let uf=0;const tn=new St,ga=new Vt,Ii=new w,jt=new Br,mr=new Br,It=new w;class Ze extends cr{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:uf++}),this.uuid=xn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(ou(e)?pu:fu)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new He().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return tn.makeRotationFromQuaternion(e),this.applyMatrix4(tn),this}rotateX(e){return tn.makeRotationX(e),this.applyMatrix4(tn),this}rotateY(e){return tn.makeRotationY(e),this.applyMatrix4(tn),this}rotateZ(e){return tn.makeRotationZ(e),this.applyMatrix4(tn),this}translate(e,t,n){return tn.makeTranslation(e,t,n),this.applyMatrix4(tn),this}scale(e,t,n){return tn.makeScale(e,t,n),this.applyMatrix4(tn),this}lookAt(e){return ga.lookAt(e),ga.updateMatrix(),this.applyMatrix4(ga.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ii).negate(),this.translate(Ii.x,Ii.y,Ii.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let r=0,s=e.length;r<s;r++){const a=e[r];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ft(n,3))}else{const n=Math.min(e.length,t.count);for(let r=0;r<n;r++){const s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Br);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new w(-1/0,-1/0,-1/0),new w(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,r=t.length;n<r;n++){const s=t[n];jt.setFromBufferAttribute(s),this.morphTargetsRelative?(It.addVectors(this.boundingBox.min,jt.min),this.boundingBox.expandByPoint(It),It.addVectors(this.boundingBox.max,jt.max),this.boundingBox.expandByPoint(It)):(this.boundingBox.expandByPoint(jt.min),this.boundingBox.expandByPoint(jt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Hs);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new w,1/0);return}if(e){const n=this.boundingSphere.center;if(jt.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){const o=t[s];mr.setFromBufferAttribute(o),this.morphTargetsRelative?(It.addVectors(jt.min,mr.min),jt.expandByPoint(It),It.addVectors(jt.max,mr.max),jt.expandByPoint(It)):(jt.expandByPoint(mr.min),jt.expandByPoint(mr.max))}jt.getCenter(n);let r=0;for(let s=0,a=e.count;s<a;s++)It.fromBufferAttribute(e,s),r=Math.max(r,n.distanceToSquared(It));if(t)for(let s=0,a=t.length;s<a;s++){const o=t[s],c=this.morphTargetsRelative;for(let l=0,u=o.count;l<u;l++)It.fromBufferAttribute(o,l),c&&(Ii.fromBufferAttribute(e,l),It.add(Ii)),r=Math.max(r,n.distanceToSquared(It))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,r=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ht(new Float32Array(4*n.count),4));const a=this.getAttribute("tangent"),o=[],c=[];for(let I=0;I<n.count;I++)o[I]=new w,c[I]=new w;const l=new w,u=new w,h=new w,d=new le,f=new le,g=new le,_=new w,m=new w;function p(I,E,x){l.fromBufferAttribute(n,I),u.fromBufferAttribute(n,E),h.fromBufferAttribute(n,x),d.fromBufferAttribute(s,I),f.fromBufferAttribute(s,E),g.fromBufferAttribute(s,x),u.sub(l),h.sub(l),f.sub(d),g.sub(d);const P=1/(f.x*g.y-g.x*f.y);isFinite(P)&&(_.copy(u).multiplyScalar(g.y).addScaledVector(h,-f.y).multiplyScalar(P),m.copy(h).multiplyScalar(f.x).addScaledVector(u,-g.x).multiplyScalar(P),o[I].add(_),o[E].add(_),o[x].add(_),c[I].add(m),c[E].add(m),c[x].add(m))}let T=this.groups;T.length===0&&(T=[{start:0,count:e.count}]);for(let I=0,E=T.length;I<E;++I){const x=T[I],P=x.start,z=x.count;for(let U=P,B=P+z;U<B;U+=3)p(e.getX(U+0),e.getX(U+1),e.getX(U+2))}const y=new w,v=new w,L=new w,R=new w;function C(I){L.fromBufferAttribute(r,I),R.copy(L);const E=o[I];y.copy(E),y.sub(L.multiplyScalar(L.dot(E))).normalize(),v.crossVectors(R,E);const P=v.dot(c[I])<0?-1:1;a.setXYZW(I,y.x,y.y,y.z,P)}for(let I=0,E=T.length;I<E;++I){const x=T[I],P=x.start,z=x.count;for(let U=P,B=P+z;U<B;U+=3)C(e.getX(U+0)),C(e.getX(U+1)),C(e.getX(U+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Ht(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const r=new w,s=new w,a=new w,o=new w,c=new w,l=new w,u=new w,h=new w;if(e)for(let d=0,f=e.count;d<f;d+=3){const g=e.getX(d+0),_=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,_),a.fromBufferAttribute(t,m),u.subVectors(a,s),h.subVectors(r,s),u.cross(h),o.fromBufferAttribute(n,g),c.fromBufferAttribute(n,_),l.fromBufferAttribute(n,m),o.add(u),c.add(u),l.add(u),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(_,c.x,c.y,c.z),n.setXYZ(m,l.x,l.y,l.z)}else for(let d=0,f=t.count;d<f;d+=3)r.fromBufferAttribute(t,d+0),s.fromBufferAttribute(t,d+1),a.fromBufferAttribute(t,d+2),u.subVectors(a,s),h.subVectors(r,s),u.cross(h),n.setXYZ(d+0,u.x,u.y,u.z),n.setXYZ(d+1,u.x,u.y,u.z),n.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)It.fromBufferAttribute(e,t),It.normalize(),e.setXYZ(t,It.x,It.y,It.z)}toNonIndexed(){function e(o,c){const l=o.array,u=o.itemSize,h=o.normalized,d=new l.constructor(c.length*u);let f=0,g=0;for(let _=0,m=c.length;_<m;_++){o.isInterleavedBufferAttribute?f=c[_]*o.data.stride+o.offset:f=c[_]*u;for(let p=0;p<u;p++)d[g++]=l[f++]}return new Ht(d,u,h)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Ze,n=this.index.array,r=this.attributes;for(const o in r){const c=r[o],l=e(c,n);t.setAttribute(o,l)}const s=this.morphAttributes;for(const o in s){const c=[],l=s[o];for(let u=0,h=l.length;u<h;u++){const d=l[u],f=e(d,n);c.push(f)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,c=a.length;o<c;o++){const l=a[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const l=n[c];e.data.attributes[c]=l.toJSON(e.data)}const r={};let s=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],u=[];for(let h=0,d=l.length;h<d;h++){const f=l[h];u.push(f.toJSON(e.data))}u.length>0&&(r[c]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone(t));const r=e.attributes;for(const l in r){const u=r[l];this.setAttribute(l,u.clone(t))}const s=e.morphAttributes;for(const l in s){const u=[],h=s[l];for(let d=0,f=h.length;d<f;d++)u.push(h[d].clone(t));this.morphAttributes[l]=u}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let l=0,u=a.length;l<u;l++){const h=a[l];this.addGroup(h.start,h.count,h.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Yc=new St,si=new uu,Qr=new Hs,qc=new w,es=new w,ts=new w,ns=new w,_a=new w,is=new w,Zc=new w,rs=new w;class mt extends Vt{constructor(e=new Ze,t=new _t){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){const n=this.geometry,r=n.attributes.position,s=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);const o=this.morphTargetInfluences;if(s&&o){is.set(0,0,0);for(let c=0,l=s.length;c<l;c++){const u=o[c],h=s[c];u!==0&&(_a.fromBufferAttribute(h,e),a?is.addScaledVector(_a,u):is.addScaledVector(_a.sub(t),u))}t.add(is)}return t}raycast(e,t){const n=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Qr.copy(n.boundingSphere),Qr.applyMatrix4(s),si.copy(e.ray).recast(e.near),!(Qr.containsPoint(si.origin)===!1&&(si.intersectSphere(Qr,qc)===null||si.origin.distanceToSquared(qc)>(e.far-e.near)**2))&&(Yc.copy(s).invert(),si.copy(e.ray).applyMatrix4(Yc),!(n.boundingBox!==null&&si.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,si)))}_computeIntersections(e,t,n){let r;const s=this.geometry,a=this.material,o=s.index,c=s.attributes.position,l=s.attributes.uv,u=s.attributes.uv1,h=s.attributes.normal,d=s.groups,f=s.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,_=d.length;g<_;g++){const m=d[g],p=a[m.materialIndex],T=Math.max(m.start,f.start),y=Math.min(o.count,Math.min(m.start+m.count,f.start+f.count));for(let v=T,L=y;v<L;v+=3){const R=o.getX(v),C=o.getX(v+1),I=o.getX(v+2);r=ss(this,p,e,n,l,u,h,R,C,I),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,f.start),_=Math.min(o.count,f.start+f.count);for(let m=g,p=_;m<p;m+=3){const T=o.getX(m),y=o.getX(m+1),v=o.getX(m+2);r=ss(this,a,e,n,l,u,h,T,y,v),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}else if(c!==void 0)if(Array.isArray(a))for(let g=0,_=d.length;g<_;g++){const m=d[g],p=a[m.materialIndex],T=Math.max(m.start,f.start),y=Math.min(c.count,Math.min(m.start+m.count,f.start+f.count));for(let v=T,L=y;v<L;v+=3){const R=v,C=v+1,I=v+2;r=ss(this,p,e,n,l,u,h,R,C,I),r&&(r.faceIndex=Math.floor(v/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,f.start),_=Math.min(c.count,f.start+f.count);for(let m=g,p=_;m<p;m+=3){const T=m,y=m+1,v=m+2;r=ss(this,a,e,n,l,u,h,T,y,v),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}}}function hf(i,e,t,n,r,s,a,o){let c;if(e.side===Zt?c=n.intersectTriangle(a,s,r,!0,o):c=n.intersectTriangle(r,s,a,e.side===Qn,o),c===null)return null;rs.copy(o),rs.applyMatrix4(i.matrixWorld);const l=t.ray.origin.distanceTo(rs);return l<t.near||l>t.far?null:{distance:l,point:rs.clone(),object:i}}function ss(i,e,t,n,r,s,a,o,c,l){i.getVertexPosition(o,es),i.getVertexPosition(c,ts),i.getVertexPosition(l,ns);const u=hf(i,e,t,n,es,ts,ns,Zc);if(u){const h=new w;Jt.getBarycoord(Zc,es,ts,ns,h),r&&(u.uv=Jt.getInterpolatedAttribute(r,o,c,l,h,new le)),s&&(u.uv1=Jt.getInterpolatedAttribute(s,o,c,l,h,new le)),a&&(u.normal=Jt.getInterpolatedAttribute(a,o,c,l,h,new w),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));const d={a:o,b:c,c:l,normal:new w,materialIndex:0};Jt.getNormal(es,ts,ns,d.normal),u.face=d,u.barycoord=h}return u}class xi extends Ze{constructor(e=1,t=1,n=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const c=[],l=[],u=[],h=[];let d=0,f=0;g("z","y","x",-1,-1,n,t,e,a,s,0),g("z","y","x",1,-1,n,t,-e,a,s,1),g("x","z","y",1,1,e,n,t,r,a,2),g("x","z","y",1,-1,e,n,-t,r,a,3),g("x","y","z",1,-1,e,t,n,r,s,4),g("x","y","z",-1,-1,e,t,-n,r,s,5),this.setIndex(c),this.setAttribute("position",new ft(l,3)),this.setAttribute("normal",new ft(u,3)),this.setAttribute("uv",new ft(h,2));function g(_,m,p,T,y,v,L,R,C,I,E){const x=v/C,P=L/I,z=v/2,U=L/2,B=R/2,X=C+1,G=I+1;let K=0,O=0;const J=new w;for(let se=0;se<G;se++){const ve=se*P-U;for(let Ue=0;Ue<X;Ue++){const Qe=Ue*x-z;J[_]=Qe*T,J[m]=ve*y,J[p]=B,l.push(J.x,J.y,J.z),J[_]=0,J[m]=0,J[p]=R>0?1:-1,u.push(J.x,J.y,J.z),h.push(Ue/C),h.push(1-se/I),K+=1}}for(let se=0;se<I;se++)for(let ve=0;ve<C;ve++){const Ue=d+ve+X*se,Qe=d+ve+X*(se+1),Y=d+(ve+1)+X*(se+1),ae=d+(ve+1)+X*se;c.push(Ue,Qe,ae),c.push(Qe,Y,ae),O+=6}o.addGroup(f,O,E),f+=O,d+=K}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new xi(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function ar(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const r=i[t][n];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=r.clone():Array.isArray(r)?e[t][n]=r.slice():e[t][n]=r}}return e}function zt(i){const e={};for(let t=0;t<i.length;t++){const n=ar(i[t]);for(const r in n)e[r]=n[r]}return e}function df(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function mu(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:st.workingColorSpace}const ff={clone:ar,merge:zt};var pf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,mf=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class ei extends lr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=pf,this.fragmentShader=mf,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=ar(e.uniforms),this.uniformsGroups=df(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class gu extends Vt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new St,this.projectionMatrix=new St,this.projectionMatrixInverse=new St,this.coordinateSystem=In}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Hn=new w,$c=new le,Kc=new le;class rn extends gu{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Ir*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(qi*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Ir*2*Math.atan(Math.tan(qi*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Hn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Hn.x,Hn.y).multiplyScalar(-e/Hn.z),Hn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Hn.x,Hn.y).multiplyScalar(-e/Hn.z)}getViewSize(e,t){return this.getViewBounds(e,$c,Kc),t.subVectors(Kc,$c)}setViewOffset(e,t,n,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(qi*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const c=a.fullWidth,l=a.fullHeight;s+=a.offsetX*r/c,t-=a.offsetY*n/l,r*=a.width/c,n*=a.height/l}const o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-n,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const Di=-90,Ni=1;class gf extends Vt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new rn(Di,Ni,e,t);r.layers=this.layers,this.add(r);const s=new rn(Di,Ni,e,t);s.layers=this.layers,this.add(s);const a=new rn(Di,Ni,e,t);a.layers=this.layers,this.add(a);const o=new rn(Di,Ni,e,t);o.layers=this.layers,this.add(o);const c=new rn(Di,Ni,e,t);c.layers=this.layers,this.add(c);const l=new rn(Di,Ni,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,r,s,a,o,c]=t;for(const l of t)this.remove(l);if(e===In)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===Us)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,c,l,u]=this.children,h=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,r),e.render(t,s),e.setRenderTarget(n,1,r),e.render(t,a),e.setRenderTarget(n,2,r),e.render(t,o),e.setRenderTarget(n,3,r),e.render(t,c),e.setRenderTarget(n,4,r),e.render(t,l),n.texture.generateMipmaps=_,e.setRenderTarget(n,5,r),e.render(t,u),e.setRenderTarget(h,d,f),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class _u extends Nt{constructor(e,t,n,r,s,a,o,c,l,u){e=e!==void 0?e:[],t=t!==void 0?t:tr,super(e,t,n,r,s,a,o,c,l,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class _f extends _i{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new _u(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:qt}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new xi(5,5,5),s=new ei({name:"CubemapFromEquirect",uniforms:ar(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Zt,blending:Kn});s.uniforms.tEquirect.value=t;const a=new mt(r,s),o=t.minFilter;return t.minFilter===pi&&(t.minFilter=qt),new gf(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,n,r){const s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,r);e.setRenderTarget(s)}}class xt extends Vt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const vf={type:"move"};class va{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new xt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new xt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new w,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new w),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new xt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new w,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new w),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,s=null,a=null;const o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){a=!0;for(const _ of e.hand.values()){const m=t.getJointPose(_,n),p=this._getHandJoint(l,_);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const u=l.joints["index-finger-tip"],h=l.joints["thumb-tip"],d=u.position.distanceTo(h.position),f=.02,g=.005;l.inputState.pinching&&d>f+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&d<=f-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(vf)))}return o!==null&&(o.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new xt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class vu extends Vt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Fn,this.environmentIntensity=1,this.environmentRotation=new Fn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class xf{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=No,this.updateRanges=[],this.version=0,this.uuid=xn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0,s=this.stride;r<s;r++)this.array[e+r]=t.array[n+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=xn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=xn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const Bt=new w;class Os{constructor(e,t,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Bt.fromBufferAttribute(this,t),Bt.applyMatrix4(e),this.setXYZ(t,Bt.x,Bt.y,Bt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Bt.fromBufferAttribute(this,t),Bt.applyNormalMatrix(e),this.setXYZ(t,Bt.x,Bt.y,Bt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Bt.fromBufferAttribute(this,t),Bt.transformDirection(e),this.setXYZ(t,Bt.x,Bt.y,Bt.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=dn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=ht(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=ht(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=ht(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=ht(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=ht(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=dn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=dn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=dn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=dn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=ht(t,this.array),n=ht(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=ht(t,this.array),n=ht(n,this.array),r=ht(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=ht(t,this.array),n=ht(n,this.array),r=ht(r,this.array),s=ht(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this.data.array[e+3]=s,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const r=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[r+s])}return new Ht(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new Os(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const r=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[r+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}class sn extends lr{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new tt(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let Ui;const gr=new w,Fi=new w,Oi=new w,ki=new le,_r=new le,xu=new St,as=new w,vr=new w,os=new w,jc=new le,xa=new le,Jc=new le;class mn extends Vt{constructor(e=new sn){if(super(),this.isSprite=!0,this.type="Sprite",Ui===void 0){Ui=new Ze;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new xf(t,5);Ui.setIndex([0,1,2,0,2,3]),Ui.setAttribute("position",new Os(n,3,0,!1)),Ui.setAttribute("uv",new Os(n,2,3,!1))}this.geometry=Ui,this.material=e,this.center=new le(.5,.5)}raycast(e,t){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),Fi.setFromMatrixScale(this.matrixWorld),xu.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),Oi.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Fi.multiplyScalar(-Oi.z);const n=this.material.rotation;let r,s;n!==0&&(s=Math.cos(n),r=Math.sin(n));const a=this.center;cs(as.set(-.5,-.5,0),Oi,a,Fi,r,s),cs(vr.set(.5,-.5,0),Oi,a,Fi,r,s),cs(os.set(.5,.5,0),Oi,a,Fi,r,s),jc.set(0,0),xa.set(1,0),Jc.set(1,1);let o=e.ray.intersectTriangle(as,vr,os,!1,gr);if(o===null&&(cs(vr.set(-.5,.5,0),Oi,a,Fi,r,s),xa.set(0,1),o=e.ray.intersectTriangle(as,os,vr,!1,gr),o===null))return;const c=e.ray.origin.distanceTo(gr);c<e.near||c>e.far||t.push({distance:c,point:gr.clone(),uv:Jt.getInterpolation(gr,as,vr,os,jc,xa,Jc,new le),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function cs(i,e,t,n,r,s){ki.subVectors(i,t).addScalar(.5).multiply(n),r!==void 0?(_r.x=s*ki.x-r*ki.y,_r.y=r*ki.x+s*ki.y):_r.copy(ki),i.copy(e),i.x+=_r.x,i.y+=_r.y,i.applyMatrix4(xu)}const Ma=new w,Mf=new w,yf=new He;class li{constructor(e=new w(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const r=Ma.subVectors(n,t).cross(Mf.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(Ma),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||yf.getNormalMatrix(e),r=this.coplanarPoint(Ma).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const ai=new Hs,ls=new w;class Mu{constructor(e=new li,t=new li,n=new li,r=new li,s=new li,a=new li){this.planes=[e,t,n,r,s,a]}set(e,t,n,r,s,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=In){const n=this.planes,r=e.elements,s=r[0],a=r[1],o=r[2],c=r[3],l=r[4],u=r[5],h=r[6],d=r[7],f=r[8],g=r[9],_=r[10],m=r[11],p=r[12],T=r[13],y=r[14],v=r[15];if(n[0].setComponents(c-s,d-l,m-f,v-p).normalize(),n[1].setComponents(c+s,d+l,m+f,v+p).normalize(),n[2].setComponents(c+a,d+u,m+g,v+T).normalize(),n[3].setComponents(c-a,d-u,m-g,v-T).normalize(),n[4].setComponents(c-o,d-h,m-_,v-y).normalize(),t===In)n[5].setComponents(c+o,d+h,m+_,v+y).normalize();else if(t===Us)n[5].setComponents(o,h,_,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),ai.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),ai.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(ai)}intersectsSprite(e){return ai.center.set(0,0,0),ai.radius=.7071067811865476,ai.applyMatrix4(e.matrixWorld),this.intersectsSphere(ai)}intersectsSphere(e){const t=this.planes,n=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const r=t[n];if(ls.x=r.normal.x>0?e.max.x:e.min.x,ls.y=r.normal.y>0?e.max.y:e.min.y,ls.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(ls)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Ke extends lr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new tt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ks=new w,Bs=new w,Qc=new St,xr=new uu,us=new Hs,ya=new w,el=new w;class Mn extends Vt{constructor(e=new Ze,t=new Ke){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let r=1,s=t.count;r<s;r++)ks.fromBufferAttribute(t,r-1),Bs.fromBufferAttribute(t,r),n[r]=n[r-1],n[r]+=ks.distanceTo(Bs);e.setAttribute("lineDistance",new ft(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),us.copy(n.boundingSphere),us.applyMatrix4(r),us.radius+=s,e.ray.intersectsSphere(us)===!1)return;Qc.copy(r).invert(),xr.copy(e.ray).applyMatrix4(Qc);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=this.isLineSegments?2:1,u=n.index,d=n.attributes.position;if(u!==null){const f=Math.max(0,a.start),g=Math.min(u.count,a.start+a.count);for(let _=f,m=g-1;_<m;_+=l){const p=u.getX(_),T=u.getX(_+1),y=hs(this,e,xr,c,p,T,_);y&&t.push(y)}if(this.isLineLoop){const _=u.getX(g-1),m=u.getX(f),p=hs(this,e,xr,c,_,m,g-1);p&&t.push(p)}}else{const f=Math.max(0,a.start),g=Math.min(d.count,a.start+a.count);for(let _=f,m=g-1;_<m;_+=l){const p=hs(this,e,xr,c,_,_+1,_);p&&t.push(p)}if(this.isLineLoop){const _=hs(this,e,xr,c,g-1,f,g-1);_&&t.push(_)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}function hs(i,e,t,n,r,s,a){const o=i.geometry.attributes.position;if(ks.fromBufferAttribute(o,r),Bs.fromBufferAttribute(o,s),t.distanceSqToSegment(ks,Bs,ya,el)>n)return;ya.applyMatrix4(i.matrixWorld);const l=e.ray.origin.distanceTo(ya);if(!(l<e.near||l>e.far))return{distance:l,point:el.clone().applyMatrix4(i.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:i}}const tl=new w,nl=new w;class Gt extends Mn{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let r=0,s=t.count;r<s;r+=2)tl.fromBufferAttribute(t,r),nl.fromBufferAttribute(t,r+1),n[r]=r===0?0:n[r-1],n[r+1]=n[r]+tl.distanceTo(nl);e.setAttribute("lineDistance",new ft(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Zn extends Mn{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}}class Mi extends Nt{constructor(e,t,n,r,s,a,o,c,l){super(e,t,n,r,s,a,o,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}class yu extends Nt{constructor(e,t,n,r,s,a,o,c,l,u=Yi){if(u!==Yi&&u!==rr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&u===Yi&&(n=gi),n===void 0&&u===rr&&(n=ir),super(null,r,s,a,o,c,u,n,l),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o!==void 0?o:pn,this.minFilter=c!==void 0?c:pn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Sn{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(e,t){const n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let n,r=this.getPoint(0),s=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),s+=n.distanceTo(r),t.push(s),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t){const n=this.getLengths();let r=0;const s=n.length;let a;t?a=t:a=e*n[s-1];let o=0,c=s-1,l;for(;o<=c;)if(r=Math.floor(o+(c-o)/2),l=n[r]-a,l<0)o=r+1;else if(l>0)c=r-1;else{c=r;break}if(r=c,n[r]===a)return r/(s-1);const u=n[r],d=n[r+1]-u,f=(a-u)/d;return(r+f)/(s-1)}getTangent(e,t){let r=e-1e-4,s=e+1e-4;r<0&&(r=0),s>1&&(s=1);const a=this.getPoint(r),o=this.getPoint(s),c=t||(a.isVector2?new le:new w);return c.copy(o).sub(a).normalize(),c}getTangentAt(e,t){const n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t){const n=new w,r=[],s=[],a=[],o=new w,c=new St;for(let f=0;f<=e;f++){const g=f/e;r[f]=this.getTangentAt(g,new w)}s[0]=new w,a[0]=new w;let l=Number.MAX_VALUE;const u=Math.abs(r[0].x),h=Math.abs(r[0].y),d=Math.abs(r[0].z);u<=l&&(l=u,n.set(1,0,0)),h<=l&&(l=h,n.set(0,1,0)),d<=l&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),s[0].crossVectors(r[0],o),a[0].crossVectors(r[0],s[0]);for(let f=1;f<=e;f++){if(s[f]=s[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(r[f-1],r[f]),o.length()>Number.EPSILON){o.normalize();const g=Math.acos(Ye(r[f-1].dot(r[f]),-1,1));s[f].applyMatrix4(c.makeRotationAxis(o,g))}a[f].crossVectors(r[f],s[f])}if(t===!0){let f=Math.acos(Ye(s[0].dot(s[e]),-1,1));f/=e,r[0].dot(o.crossVectors(s[0],s[e]))>0&&(f=-f);for(let g=1;g<=e;g++)s[g].applyMatrix4(c.makeRotationAxis(r[g],f*g)),a[g].crossVectors(r[g],s[g])}return{tangents:r,normals:s,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}class ec extends Sn{constructor(e=0,t=0,n=1,r=1,s=0,a=Math.PI*2,o=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=r,this.aStartAngle=s,this.aEndAngle=a,this.aClockwise=o,this.aRotation=c}getPoint(e,t=new le){const n=t,r=Math.PI*2;let s=this.aEndAngle-this.aStartAngle;const a=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=r;for(;s>r;)s-=r;s<Number.EPSILON&&(a?s=0:s=r),this.aClockwise===!0&&!a&&(s===r?s=-r:s=s-r);const o=this.aStartAngle+e*s;let c=this.aX+this.xRadius*Math.cos(o),l=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){const u=Math.cos(this.aRotation),h=Math.sin(this.aRotation),d=c-this.aX,f=l-this.aY;c=d*u-f*h+this.aX,l=d*h+f*u+this.aY}return n.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){const e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}}class Sf extends ec{constructor(e,t,n,r,s,a){super(e,t,n,n,r,s,a),this.isArcCurve=!0,this.type="ArcCurve"}}function tc(){let i=0,e=0,t=0,n=0;function r(s,a,o,c){i=s,e=o,t=-3*s+3*a-2*o-c,n=2*s-2*a+o+c}return{initCatmullRom:function(s,a,o,c,l){r(a,o,l*(o-s),l*(c-a))},initNonuniformCatmullRom:function(s,a,o,c,l,u,h){let d=(a-s)/l-(o-s)/(l+u)+(o-a)/u,f=(o-a)/u-(c-a)/(u+h)+(c-o)/h;d*=u,f*=u,r(a,o,d,f)},calc:function(s){const a=s*s,o=a*s;return i+e*s+t*a+n*o}}}const ds=new w,Sa=new tc,Ea=new tc,Ta=new tc;class Ef extends Sn{constructor(e=[],t=!1,n="centripetal",r=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=r}getPoint(e,t=new w){const n=t,r=this.points,s=r.length,a=(s-(this.closed?0:1))*e;let o=Math.floor(a),c=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/s)+1)*s:c===0&&o===s-1&&(o=s-2,c=1);let l,u;this.closed||o>0?l=r[(o-1)%s]:(ds.subVectors(r[0],r[1]).add(r[0]),l=ds);const h=r[o%s],d=r[(o+1)%s];if(this.closed||o+2<s?u=r[(o+2)%s]:(ds.subVectors(r[s-1],r[s-2]).add(r[s-1]),u=ds),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let g=Math.pow(l.distanceToSquared(h),f),_=Math.pow(h.distanceToSquared(d),f),m=Math.pow(d.distanceToSquared(u),f);_<1e-4&&(_=1),g<1e-4&&(g=_),m<1e-4&&(m=_),Sa.initNonuniformCatmullRom(l.x,h.x,d.x,u.x,g,_,m),Ea.initNonuniformCatmullRom(l.y,h.y,d.y,u.y,g,_,m),Ta.initNonuniformCatmullRom(l.z,h.z,d.z,u.z,g,_,m)}else this.curveType==="catmullrom"&&(Sa.initCatmullRom(l.x,h.x,d.x,u.x,this.tension),Ea.initCatmullRom(l.y,h.y,d.y,u.y,this.tension),Ta.initCatmullRom(l.z,h.z,d.z,u.z,this.tension));return n.set(Sa.calc(c),Ea.calc(c),Ta.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const r=e.points[t];this.points.push(r.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const r=this.points[t];e.points.push(r.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const r=e.points[t];this.points.push(new w().fromArray(r))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function il(i,e,t,n,r){const s=(n-e)*.5,a=(r-t)*.5,o=i*i,c=i*o;return(2*t-2*n+s+a)*c+(-3*t+3*n-2*s-a)*o+s*i+t}function Tf(i,e){const t=1-i;return t*t*e}function bf(i,e){return 2*(1-i)*i*e}function Af(i,e){return i*i*e}function Tr(i,e,t,n){return Tf(i,e)+bf(i,t)+Af(i,n)}function wf(i,e){const t=1-i;return t*t*t*e}function Rf(i,e){const t=1-i;return 3*t*t*i*e}function Cf(i,e){return 3*(1-i)*i*i*e}function Pf(i,e){return i*i*i*e}function br(i,e,t,n,r){return wf(i,e)+Rf(i,t)+Cf(i,n)+Pf(i,r)}class Su extends Sn{constructor(e=new le,t=new le,n=new le,r=new le){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new le){const n=t,r=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(br(e,r.x,s.x,a.x,o.x),br(e,r.y,s.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Lf extends Sn{constructor(e=new w,t=new w,n=new w,r=new w){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new w){const n=t,r=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(br(e,r.x,s.x,a.x,o.x),br(e,r.y,s.y,a.y,o.y),br(e,r.z,s.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Eu extends Sn{constructor(e=new le,t=new le){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new le){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new le){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class If extends Sn{constructor(e=new w,t=new w){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new w){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new w){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Tu extends Sn{constructor(e=new le,t=new le,n=new le){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new le){const n=t,r=this.v0,s=this.v1,a=this.v2;return n.set(Tr(e,r.x,s.x,a.x),Tr(e,r.y,s.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Df extends Sn{constructor(e=new w,t=new w,n=new w){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new w){const n=t,r=this.v0,s=this.v1,a=this.v2;return n.set(Tr(e,r.x,s.x,a.x),Tr(e,r.y,s.y,a.y),Tr(e,r.z,s.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class bu extends Sn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new le){const n=t,r=this.points,s=(r.length-1)*e,a=Math.floor(s),o=s-a,c=r[a===0?a:a-1],l=r[a],u=r[a>r.length-2?r.length-1:a+1],h=r[a>r.length-3?r.length-1:a+2];return n.set(il(o,c.x,l.x,u.x,h.x),il(o,c.y,l.y,u.y,h.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const r=e.points[t];this.points.push(r.clone())}return this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const r=this.points[t];e.points.push(r.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const r=e.points[t];this.points.push(new le().fromArray(r))}return this}}var Uo=Object.freeze({__proto__:null,ArcCurve:Sf,CatmullRomCurve3:Ef,CubicBezierCurve:Su,CubicBezierCurve3:Lf,EllipseCurve:ec,LineCurve:Eu,LineCurve3:If,QuadraticBezierCurve:Tu,QuadraticBezierCurve3:Df,SplineCurve:bu});class Nf extends Sn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){const e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){const n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Uo[n](t,e))}return this}getPoint(e,t){const n=e*this.getLength(),r=this.getCurveLengths();let s=0;for(;s<r.length;){if(r[s]>=n){const a=r[s]-n,o=this.curves[s],c=o.getLength(),l=c===0?0:1-a/c;return o.getPointAt(l,t)}s++}return null}getLength(){const e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const e=[];let t=0;for(let n=0,r=this.curves.length;n<r;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){const t=[];let n;for(let r=0,s=this.curves;r<s.length;r++){const a=s[r],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,c=a.getPoints(o);for(let l=0;l<c.length;l++){const u=c[l];n&&n.equals(u)||(t.push(u),n=u)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const r=e.curves[t];this.curves.push(r.clone())}return this.autoClose=e.autoClose,this}toJSON(){const e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){const r=this.curves[t];e.curves.push(r.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const r=e.curves[t];this.curves.push(new Uo[r.type]().fromJSON(r))}return this}}class rl extends Nf{constructor(e){super(),this.type="Path",this.currentPoint=new le,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){const n=new Eu(this.currentPoint.clone(),new le(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,r){const s=new Tu(this.currentPoint.clone(),new le(e,t),new le(n,r));return this.curves.push(s),this.currentPoint.set(n,r),this}bezierCurveTo(e,t,n,r,s,a){const o=new Su(this.currentPoint.clone(),new le(e,t),new le(n,r),new le(s,a));return this.curves.push(o),this.currentPoint.set(s,a),this}splineThru(e){const t=[this.currentPoint.clone()].concat(e),n=new bu(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,r,s,a){const o=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(e+o,t+c,n,r,s,a),this}absarc(e,t,n,r,s,a){return this.absellipse(e,t,n,n,r,s,a),this}ellipse(e,t,n,r,s,a,o,c){const l=this.currentPoint.x,u=this.currentPoint.y;return this.absellipse(e+l,t+u,n,r,s,a,o,c),this}absellipse(e,t,n,r,s,a,o,c){const l=new ec(e,t,n,r,s,a,o,c);if(this.curves.length>0){const h=l.getPoint(0);h.equals(this.currentPoint)||this.lineTo(h.x,h.y)}this.curves.push(l);const u=l.getPoint(1);return this.currentPoint.copy(u),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){const e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}}class or extends Ze{constructor(e=1,t=1,n=1,r=32,s=1,a=!1,o=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:s,openEnded:a,thetaStart:o,thetaLength:c};const l=this;r=Math.floor(r),s=Math.floor(s);const u=[],h=[],d=[],f=[];let g=0;const _=[],m=n/2;let p=0;T(),a===!1&&(e>0&&y(!0),t>0&&y(!1)),this.setIndex(u),this.setAttribute("position",new ft(h,3)),this.setAttribute("normal",new ft(d,3)),this.setAttribute("uv",new ft(f,2));function T(){const v=new w,L=new w;let R=0;const C=(t-e)/n;for(let I=0;I<=s;I++){const E=[],x=I/s,P=x*(t-e)+e;for(let z=0;z<=r;z++){const U=z/r,B=U*c+o,X=Math.sin(B),G=Math.cos(B);L.x=P*X,L.y=-x*n+m,L.z=P*G,h.push(L.x,L.y,L.z),v.set(X,C,G).normalize(),d.push(v.x,v.y,v.z),f.push(U,1-x),E.push(g++)}_.push(E)}for(let I=0;I<r;I++)for(let E=0;E<s;E++){const x=_[E][I],P=_[E+1][I],z=_[E+1][I+1],U=_[E][I+1];(e>0||E!==0)&&(u.push(x,P,U),R+=3),(t>0||E!==s-1)&&(u.push(P,z,U),R+=3)}l.addGroup(p,R,0),p+=R}function y(v){const L=g,R=new le,C=new w;let I=0;const E=v===!0?e:t,x=v===!0?1:-1;for(let z=1;z<=r;z++)h.push(0,m*x,0),d.push(0,x,0),f.push(.5,.5),g++;const P=g;for(let z=0;z<=r;z++){const B=z/r*c+o,X=Math.cos(B),G=Math.sin(B);C.x=E*G,C.y=m*x,C.z=E*X,h.push(C.x,C.y,C.z),d.push(0,x,0),R.x=X*.5+.5,R.y=G*.5*x+.5,f.push(R.x,R.y),g++}for(let z=0;z<r;z++){const U=L+z,B=P+z;v===!0?u.push(B,B+1,U):u.push(B+1,B,U),I+=3}l.addGroup(p,I,v===!0?1:2),p+=I}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new or(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class nc extends Ze{constructor(e=[],t=[],n=1,r=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:n,detail:r};const s=[],a=[];o(r),l(n),u(),this.setAttribute("position",new ft(s,3)),this.setAttribute("normal",new ft(s.slice(),3)),this.setAttribute("uv",new ft(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(T){const y=new w,v=new w,L=new w;for(let R=0;R<t.length;R+=3)f(t[R+0],y),f(t[R+1],v),f(t[R+2],L),c(y,v,L,T)}function c(T,y,v,L){const R=L+1,C=[];for(let I=0;I<=R;I++){C[I]=[];const E=T.clone().lerp(v,I/R),x=y.clone().lerp(v,I/R),P=R-I;for(let z=0;z<=P;z++)z===0&&I===R?C[I][z]=E:C[I][z]=E.clone().lerp(x,z/P)}for(let I=0;I<R;I++)for(let E=0;E<2*(R-I)-1;E++){const x=Math.floor(E/2);E%2===0?(d(C[I][x+1]),d(C[I+1][x]),d(C[I][x])):(d(C[I][x+1]),d(C[I+1][x+1]),d(C[I+1][x]))}}function l(T){const y=new w;for(let v=0;v<s.length;v+=3)y.x=s[v+0],y.y=s[v+1],y.z=s[v+2],y.normalize().multiplyScalar(T),s[v+0]=y.x,s[v+1]=y.y,s[v+2]=y.z}function u(){const T=new w;for(let y=0;y<s.length;y+=3){T.x=s[y+0],T.y=s[y+1],T.z=s[y+2];const v=m(T)/2/Math.PI+.5,L=p(T)/Math.PI+.5;a.push(v,1-L)}g(),h()}function h(){for(let T=0;T<a.length;T+=6){const y=a[T+0],v=a[T+2],L=a[T+4],R=Math.max(y,v,L),C=Math.min(y,v,L);R>.9&&C<.1&&(y<.2&&(a[T+0]+=1),v<.2&&(a[T+2]+=1),L<.2&&(a[T+4]+=1))}}function d(T){s.push(T.x,T.y,T.z)}function f(T,y){const v=T*3;y.x=e[v+0],y.y=e[v+1],y.z=e[v+2]}function g(){const T=new w,y=new w,v=new w,L=new w,R=new le,C=new le,I=new le;for(let E=0,x=0;E<s.length;E+=9,x+=6){T.set(s[E+0],s[E+1],s[E+2]),y.set(s[E+3],s[E+4],s[E+5]),v.set(s[E+6],s[E+7],s[E+8]),R.set(a[x+0],a[x+1]),C.set(a[x+2],a[x+3]),I.set(a[x+4],a[x+5]),L.copy(T).add(y).add(v).divideScalar(3);const P=m(L);_(R,x+0,T,P),_(C,x+2,y,P),_(I,x+4,v,P)}}function _(T,y,v,L){L<0&&T.x===1&&(a[y]=T.x-1),v.x===0&&v.z===0&&(a[y]=L/2/Math.PI+.5)}function m(T){return Math.atan2(T.z,-T.x)}function p(T){return Math.atan2(-T.y,Math.sqrt(T.x*T.x+T.z*T.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new nc(e.vertices,e.indices,e.radius,e.details)}}const fs=new w,ps=new w,ba=new w,ms=new Jt;class ic extends Ze{constructor(e=null,t=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:e,thresholdAngle:t},e!==null){const r=Math.pow(10,4),s=Math.cos(qi*t),a=e.getIndex(),o=e.getAttribute("position"),c=a?a.count:o.count,l=[0,0,0],u=["a","b","c"],h=new Array(3),d={},f=[];for(let g=0;g<c;g+=3){a?(l[0]=a.getX(g),l[1]=a.getX(g+1),l[2]=a.getX(g+2)):(l[0]=g,l[1]=g+1,l[2]=g+2);const{a:_,b:m,c:p}=ms;if(_.fromBufferAttribute(o,l[0]),m.fromBufferAttribute(o,l[1]),p.fromBufferAttribute(o,l[2]),ms.getNormal(ba),h[0]=`${Math.round(_.x*r)},${Math.round(_.y*r)},${Math.round(_.z*r)}`,h[1]=`${Math.round(m.x*r)},${Math.round(m.y*r)},${Math.round(m.z*r)}`,h[2]=`${Math.round(p.x*r)},${Math.round(p.y*r)},${Math.round(p.z*r)}`,!(h[0]===h[1]||h[1]===h[2]||h[2]===h[0]))for(let T=0;T<3;T++){const y=(T+1)%3,v=h[T],L=h[y],R=ms[u[T]],C=ms[u[y]],I=`${v}_${L}`,E=`${L}_${v}`;E in d&&d[E]?(ba.dot(d[E].normal)<=s&&(f.push(R.x,R.y,R.z),f.push(C.x,C.y,C.z)),d[E]=null):I in d||(d[I]={index0:l[T],index1:l[y],normal:ba.clone()})}}for(const g in d)if(d[g]){const{index0:_,index1:m}=d[g];fs.fromBufferAttribute(o,_),ps.fromBufferAttribute(o,m),f.push(fs.x,fs.y,fs.z),f.push(ps.x,ps.y,ps.z)}this.setAttribute("position",new ft(f,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}}class Ws extends rl{constructor(e){super(e),this.uuid=xn(),this.type="Shape",this.holes=[]}getPointsHoles(e){const t=[];for(let n=0,r=this.holes.length;n<r;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const r=e.holes[t];this.holes.push(r.clone())}return this}toJSON(){const e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){const r=this.holes[t];e.holes.push(r.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const r=e.holes[t];this.holes.push(new rl().fromJSON(r))}return this}}const Uf={triangulate:function(i,e,t=2){const n=e&&e.length,r=n?e[0]*t:i.length;let s=Au(i,0,r,t,!0);const a=[];if(!s||s.next===s.prev)return a;let o,c,l,u,h,d,f;if(n&&(s=zf(i,e,s,t)),i.length>80*t){o=l=i[0],c=u=i[1];for(let g=t;g<r;g+=t)h=i[g],d=i[g+1],h<o&&(o=h),d<c&&(c=d),h>l&&(l=h),d>u&&(u=d);f=Math.max(l-o,u-c),f=f!==0?32767/f:0}return Dr(s,a,t,o,c,f,0),a}};function Au(i,e,t,n,r){let s,a;if(r===jf(i,e,t,n)>0)for(s=e;s<t;s+=n)a=sl(s,i[s],i[s+1],a);else for(s=t-n;s>=e;s-=n)a=sl(s,i[s],i[s+1],a);return a&&Xs(a,a.next)&&(Ur(a),a=a.next),a}function vi(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(Xs(t,t.next)||yt(t.prev,t,t.next)===0)){if(Ur(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function Dr(i,e,t,n,r,s,a){if(!i)return;!a&&s&&Xf(i,n,r,s);let o=i,c,l;for(;i.prev!==i.next;){if(c=i.prev,l=i.next,s?Of(i,n,r,s):Ff(i)){e.push(c.i/t|0),e.push(i.i/t|0),e.push(l.i/t|0),Ur(i),i=l.next,o=l.next;continue}if(i=l,i===o){a?a===1?(i=kf(vi(i),e,t),Dr(i,e,t,n,r,s,2)):a===2&&Bf(i,e,t,n,r,s):Dr(vi(i),e,t,n,r,s,1);break}}}function Ff(i){const e=i.prev,t=i,n=i.next;if(yt(e,t,n)>=0)return!1;const r=e.x,s=t.x,a=n.x,o=e.y,c=t.y,l=n.y,u=r<s?r<a?r:a:s<a?s:a,h=o<c?o<l?o:l:c<l?c:l,d=r>s?r>a?r:a:s>a?s:a,f=o>c?o>l?o:l:c>l?c:l;let g=n.next;for(;g!==e;){if(g.x>=u&&g.x<=d&&g.y>=h&&g.y<=f&&Hi(r,o,s,c,a,l,g.x,g.y)&&yt(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function Of(i,e,t,n){const r=i.prev,s=i,a=i.next;if(yt(r,s,a)>=0)return!1;const o=r.x,c=s.x,l=a.x,u=r.y,h=s.y,d=a.y,f=o<c?o<l?o:l:c<l?c:l,g=u<h?u<d?u:d:h<d?h:d,_=o>c?o>l?o:l:c>l?c:l,m=u>h?u>d?u:d:h>d?h:d,p=Fo(f,g,e,t,n),T=Fo(_,m,e,t,n);let y=i.prevZ,v=i.nextZ;for(;y&&y.z>=p&&v&&v.z<=T;){if(y.x>=f&&y.x<=_&&y.y>=g&&y.y<=m&&y!==r&&y!==a&&Hi(o,u,c,h,l,d,y.x,y.y)&&yt(y.prev,y,y.next)>=0||(y=y.prevZ,v.x>=f&&v.x<=_&&v.y>=g&&v.y<=m&&v!==r&&v!==a&&Hi(o,u,c,h,l,d,v.x,v.y)&&yt(v.prev,v,v.next)>=0))return!1;v=v.nextZ}for(;y&&y.z>=p;){if(y.x>=f&&y.x<=_&&y.y>=g&&y.y<=m&&y!==r&&y!==a&&Hi(o,u,c,h,l,d,y.x,y.y)&&yt(y.prev,y,y.next)>=0)return!1;y=y.prevZ}for(;v&&v.z<=T;){if(v.x>=f&&v.x<=_&&v.y>=g&&v.y<=m&&v!==r&&v!==a&&Hi(o,u,c,h,l,d,v.x,v.y)&&yt(v.prev,v,v.next)>=0)return!1;v=v.nextZ}return!0}function kf(i,e,t){let n=i;do{const r=n.prev,s=n.next.next;!Xs(r,s)&&wu(r,n,n.next,s)&&Nr(r,s)&&Nr(s,r)&&(e.push(r.i/t|0),e.push(n.i/t|0),e.push(s.i/t|0),Ur(n),Ur(n.next),n=i=s),n=n.next}while(n!==i);return vi(n)}function Bf(i,e,t,n,r,s){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&Zf(a,o)){let c=Ru(a,o);a=vi(a,a.next),c=vi(c,c.next),Dr(a,e,t,n,r,s,0),Dr(c,e,t,n,r,s,0);return}o=o.next}a=a.next}while(a!==i)}function zf(i,e,t,n){const r=[];let s,a,o,c,l;for(s=0,a=e.length;s<a;s++)o=e[s]*n,c=s<a-1?e[s+1]*n:i.length,l=Au(i,o,c,n,!1),l===l.next&&(l.steiner=!0),r.push(qf(l));for(r.sort(Gf),s=0;s<r.length;s++)t=Vf(r[s],t);return t}function Gf(i,e){return i.x-e.x}function Vf(i,e){const t=Hf(i,e);if(!t)return e;const n=Ru(t,i);return vi(n,n.next),vi(t,t.next)}function Hf(i,e){let t=e,n=-1/0,r;const s=i.x,a=i.y;do{if(a<=t.y&&a>=t.next.y&&t.next.y!==t.y){const d=t.x+(a-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=s&&d>n&&(n=d,r=t.x<t.next.x?t:t.next,d===s))return r}t=t.next}while(t!==e);if(!r)return null;const o=r,c=r.x,l=r.y;let u=1/0,h;t=r;do s>=t.x&&t.x>=c&&s!==t.x&&Hi(a<l?s:n,a,c,l,a<l?n:s,a,t.x,t.y)&&(h=Math.abs(a-t.y)/(s-t.x),Nr(t,i)&&(h<u||h===u&&(t.x>r.x||t.x===r.x&&Wf(r,t)))&&(r=t,u=h)),t=t.next;while(t!==o);return r}function Wf(i,e){return yt(i.prev,i,e.prev)<0&&yt(e.next,i,i.next)<0}function Xf(i,e,t,n){let r=i;do r.z===0&&(r.z=Fo(r.x,r.y,e,t,n)),r.prevZ=r.prev,r.nextZ=r.next,r=r.next;while(r!==i);r.prevZ.nextZ=null,r.prevZ=null,Yf(r)}function Yf(i){let e,t,n,r,s,a,o,c,l=1;do{for(t=i,i=null,s=null,a=0;t;){for(a++,n=t,o=0,e=0;e<l&&(o++,n=n.nextZ,!!n);e++);for(c=l;o>0||c>0&&n;)o!==0&&(c===0||!n||t.z<=n.z)?(r=t,t=t.nextZ,o--):(r=n,n=n.nextZ,c--),s?s.nextZ=r:i=r,r.prevZ=s,s=r;t=n}s.nextZ=null,l*=2}while(a>1);return i}function Fo(i,e,t,n,r){return i=(i-t)*r|0,e=(e-n)*r|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function qf(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function Hi(i,e,t,n,r,s,a,o){return(r-a)*(e-o)>=(i-a)*(s-o)&&(i-a)*(n-o)>=(t-a)*(e-o)&&(t-a)*(s-o)>=(r-a)*(n-o)}function Zf(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!$f(i,e)&&(Nr(i,e)&&Nr(e,i)&&Kf(i,e)&&(yt(i.prev,i,e.prev)||yt(i,e.prev,e))||Xs(i,e)&&yt(i.prev,i,i.next)>0&&yt(e.prev,e,e.next)>0)}function yt(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function Xs(i,e){return i.x===e.x&&i.y===e.y}function wu(i,e,t,n){const r=_s(yt(i,e,t)),s=_s(yt(i,e,n)),a=_s(yt(t,n,i)),o=_s(yt(t,n,e));return!!(r!==s&&a!==o||r===0&&gs(i,t,e)||s===0&&gs(i,n,e)||a===0&&gs(t,i,n)||o===0&&gs(t,e,n))}function gs(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function _s(i){return i>0?1:i<0?-1:0}function $f(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&wu(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function Nr(i,e){return yt(i.prev,i,i.next)<0?yt(i,e,i.next)>=0&&yt(i,i.prev,e)>=0:yt(i,e,i.prev)<0||yt(i,i.next,e)<0}function Kf(i,e){let t=i,n=!1;const r=(i.x+e.x)/2,s=(i.y+e.y)/2;do t.y>s!=t.next.y>s&&t.next.y!==t.y&&r<(t.next.x-t.x)*(s-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function Ru(i,e){const t=new Oo(i.i,i.x,i.y),n=new Oo(e.i,e.x,e.y),r=i.next,s=e.prev;return i.next=e,e.prev=i,t.next=r,r.prev=t,n.next=t,t.prev=n,s.next=n,n.prev=s,n}function sl(i,e,t,n){const r=new Oo(i,e,t);return n?(r.next=n.next,r.prev=n,n.next.prev=r,n.next=r):(r.prev=r,r.next=r),r}function Ur(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function Oo(i,e,t){this.i=i,this.x=e,this.y=t,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}function jf(i,e,t,n){let r=0;for(let s=e,a=t-n;s<t;s+=n)r+=(i[a]-i[s])*(i[s+1]+i[a+1]),a=s;return r}class Ar{static area(e){const t=e.length;let n=0;for(let r=t-1,s=0;s<t;r=s++)n+=e[r].x*e[s].y-e[s].x*e[r].y;return n*.5}static isClockWise(e){return Ar.area(e)<0}static triangulateShape(e,t){const n=[],r=[],s=[];al(e),ol(n,e);let a=e.length;t.forEach(al);for(let c=0;c<t.length;c++)r.push(a),a+=t[c].length,ol(n,t[c]);const o=Uf.triangulate(n,r);for(let c=0;c<o.length;c+=3)s.push(o.slice(c,c+3));return s}}function al(i){const e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function ol(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}class zr extends Ze{constructor(e=new Ws([new le(.5,.5),new le(-.5,.5),new le(-.5,-.5),new le(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];const n=this,r=[],s=[];for(let o=0,c=e.length;o<c;o++){const l=e[o];a(l)}this.setAttribute("position",new ft(r,3)),this.setAttribute("uv",new ft(s,2)),this.computeVertexNormals();function a(o){const c=[],l=t.curveSegments!==void 0?t.curveSegments:12,u=t.steps!==void 0?t.steps:1,h=t.depth!==void 0?t.depth:1;let d=t.bevelEnabled!==void 0?t.bevelEnabled:!0,f=t.bevelThickness!==void 0?t.bevelThickness:.2,g=t.bevelSize!==void 0?t.bevelSize:f-.1,_=t.bevelOffset!==void 0?t.bevelOffset:0,m=t.bevelSegments!==void 0?t.bevelSegments:3;const p=t.extrudePath,T=t.UVGenerator!==void 0?t.UVGenerator:Jf;let y,v=!1,L,R,C,I;p&&(y=p.getSpacedPoints(u),v=!0,d=!1,L=p.computeFrenetFrames(u,!1),R=new w,C=new w,I=new w),d||(m=0,f=0,g=0,_=0);const E=o.extractPoints(l);let x=E.shape;const P=E.holes;if(!Ar.isClockWise(x)){x=x.reverse();for(let ee=0,Q=P.length;ee<Q;ee++){const A=P[ee];Ar.isClockWise(A)&&(P[ee]=A.reverse())}}const U=Ar.triangulateShape(x,P),B=x;for(let ee=0,Q=P.length;ee<Q;ee++){const A=P[ee];x=x.concat(A)}function X(ee,Q,A){return Q||console.error("THREE.ExtrudeGeometry: vec does not exist"),ee.clone().addScaledVector(Q,A)}const G=x.length,K=U.length;function O(ee,Q,A){let Ce,te,Me;const oe=ee.x-Q.x,Fe=ee.y-Q.y,me=A.x-ee.x,b=A.y-ee.y,M=oe*oe+Fe*Fe,k=oe*b-Fe*me;if(Math.abs(k)>Number.EPSILON){const q=Math.sqrt(M),j=Math.sqrt(me*me+b*b),Z=Q.x-Fe/q,Re=Q.y+oe/q,he=A.x-b/j,xe=A.y+me/j,je=((he-Z)*b-(xe-Re)*me)/(oe*b-Fe*me);Ce=Z+oe*je-ee.x,te=Re+Fe*je-ee.y;const ie=Ce*Ce+te*te;if(ie<=2)return new le(Ce,te);Me=Math.sqrt(ie/2)}else{let q=!1;oe>Number.EPSILON?me>Number.EPSILON&&(q=!0):oe<-Number.EPSILON?me<-Number.EPSILON&&(q=!0):Math.sign(Fe)===Math.sign(b)&&(q=!0),q?(Ce=-Fe,te=oe,Me=Math.sqrt(M)):(Ce=oe,te=Fe,Me=Math.sqrt(M/2))}return new le(Ce/Me,te/Me)}const J=[];for(let ee=0,Q=B.length,A=Q-1,Ce=ee+1;ee<Q;ee++,A++,Ce++)A===Q&&(A=0),Ce===Q&&(Ce=0),J[ee]=O(B[ee],B[A],B[Ce]);const se=[];let ve,Ue=J.concat();for(let ee=0,Q=P.length;ee<Q;ee++){const A=P[ee];ve=[];for(let Ce=0,te=A.length,Me=te-1,oe=Ce+1;Ce<te;Ce++,Me++,oe++)Me===te&&(Me=0),oe===te&&(oe=0),ve[Ce]=O(A[Ce],A[Me],A[oe]);se.push(ve),Ue=Ue.concat(ve)}for(let ee=0;ee<m;ee++){const Q=ee/m,A=f*Math.cos(Q*Math.PI/2),Ce=g*Math.sin(Q*Math.PI/2)+_;for(let te=0,Me=B.length;te<Me;te++){const oe=X(B[te],J[te],Ce);ce(oe.x,oe.y,-A)}for(let te=0,Me=P.length;te<Me;te++){const oe=P[te];ve=se[te];for(let Fe=0,me=oe.length;Fe<me;Fe++){const b=X(oe[Fe],ve[Fe],Ce);ce(b.x,b.y,-A)}}}const Qe=g+_;for(let ee=0;ee<G;ee++){const Q=d?X(x[ee],Ue[ee],Qe):x[ee];v?(C.copy(L.normals[0]).multiplyScalar(Q.x),R.copy(L.binormals[0]).multiplyScalar(Q.y),I.copy(y[0]).add(C).add(R),ce(I.x,I.y,I.z)):ce(Q.x,Q.y,0)}for(let ee=1;ee<=u;ee++)for(let Q=0;Q<G;Q++){const A=d?X(x[Q],Ue[Q],Qe):x[Q];v?(C.copy(L.normals[ee]).multiplyScalar(A.x),R.copy(L.binormals[ee]).multiplyScalar(A.y),I.copy(y[ee]).add(C).add(R),ce(I.x,I.y,I.z)):ce(A.x,A.y,h/u*ee)}for(let ee=m-1;ee>=0;ee--){const Q=ee/m,A=f*Math.cos(Q*Math.PI/2),Ce=g*Math.sin(Q*Math.PI/2)+_;for(let te=0,Me=B.length;te<Me;te++){const oe=X(B[te],J[te],Ce);ce(oe.x,oe.y,h+A)}for(let te=0,Me=P.length;te<Me;te++){const oe=P[te];ve=se[te];for(let Fe=0,me=oe.length;Fe<me;Fe++){const b=X(oe[Fe],ve[Fe],Ce);v?ce(b.x,b.y+y[u-1].y,y[u-1].x+A):ce(b.x,b.y,h+A)}}}Y(),ae();function Y(){const ee=r.length/3;if(d){let Q=0,A=G*Q;for(let Ce=0;Ce<K;Ce++){const te=U[Ce];Le(te[2]+A,te[1]+A,te[0]+A)}Q=u+m*2,A=G*Q;for(let Ce=0;Ce<K;Ce++){const te=U[Ce];Le(te[0]+A,te[1]+A,te[2]+A)}}else{for(let Q=0;Q<K;Q++){const A=U[Q];Le(A[2],A[1],A[0])}for(let Q=0;Q<K;Q++){const A=U[Q];Le(A[0]+G*u,A[1]+G*u,A[2]+G*u)}}n.addGroup(ee,r.length/3-ee,0)}function ae(){const ee=r.length/3;let Q=0;Ae(B,Q),Q+=B.length;for(let A=0,Ce=P.length;A<Ce;A++){const te=P[A];Ae(te,Q),Q+=te.length}n.addGroup(ee,r.length/3-ee,1)}function Ae(ee,Q){let A=ee.length;for(;--A>=0;){const Ce=A;let te=A-1;te<0&&(te=ee.length-1);for(let Me=0,oe=u+m*2;Me<oe;Me++){const Fe=G*Me,me=G*(Me+1),b=Q+Ce+Fe,M=Q+te+Fe,k=Q+te+me,q=Q+Ce+me;nt(b,M,k,q)}}}function ce(ee,Q,A){c.push(ee),c.push(Q),c.push(A)}function Le(ee,Q,A){Pe(ee),Pe(Q),Pe(A);const Ce=r.length/3,te=T.generateTopUV(n,r,Ce-3,Ce-2,Ce-1);ot(te[0]),ot(te[1]),ot(te[2])}function nt(ee,Q,A,Ce){Pe(ee),Pe(Q),Pe(Ce),Pe(Q),Pe(A),Pe(Ce);const te=r.length/3,Me=T.generateSideWallUV(n,r,te-6,te-3,te-2,te-1);ot(Me[0]),ot(Me[1]),ot(Me[3]),ot(Me[1]),ot(Me[2]),ot(Me[3])}function Pe(ee){r.push(c[ee*3+0]),r.push(c[ee*3+1]),r.push(c[ee*3+2])}function ot(ee){s.push(ee.x),s.push(ee.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return Qf(t,n,e)}static fromJSON(e,t){const n=[];for(let s=0,a=e.shapes.length;s<a;s++){const o=t[e.shapes[s]];n.push(o)}const r=e.options.extrudePath;return r!==void 0&&(e.options.extrudePath=new Uo[r.type]().fromJSON(r)),new zr(n,e.options)}}const Jf={generateTopUV:function(i,e,t,n,r){const s=e[t*3],a=e[t*3+1],o=e[n*3],c=e[n*3+1],l=e[r*3],u=e[r*3+1];return[new le(s,a),new le(o,c),new le(l,u)]},generateSideWallUV:function(i,e,t,n,r,s){const a=e[t*3],o=e[t*3+1],c=e[t*3+2],l=e[n*3],u=e[n*3+1],h=e[n*3+2],d=e[r*3],f=e[r*3+1],g=e[r*3+2],_=e[s*3],m=e[s*3+1],p=e[s*3+2];return Math.abs(o-u)<Math.abs(a-l)?[new le(a,1-c),new le(l,1-h),new le(d,1-g),new le(_,1-p)]:[new le(o,1-c),new le(u,1-h),new le(f,1-g),new le(m,1-p)]}};function Qf(i,e,t){if(t.shapes=[],Array.isArray(i))for(let n=0,r=i.length;n<r;n++){const s=i[n];t.shapes.push(s.uuid)}else t.shapes.push(i.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}class Ys extends nc{constructor(e=1,t=0){const n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],r=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,r,e,t),this.type="OctahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Ys(e.radius,e.detail)}}class qs extends Ze{constructor(e=1,t=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};const s=e/2,a=t/2,o=Math.floor(n),c=Math.floor(r),l=o+1,u=c+1,h=e/o,d=t/c,f=[],g=[],_=[],m=[];for(let p=0;p<u;p++){const T=p*d-a;for(let y=0;y<l;y++){const v=y*h-s;g.push(v,-T,0),_.push(0,0,1),m.push(y/o),m.push(1-p/c)}}for(let p=0;p<c;p++)for(let T=0;T<o;T++){const y=T+l*p,v=T+l*(p+1),L=T+1+l*(p+1),R=T+1+l*p;f.push(y,v,R),f.push(v,L,R)}this.setIndex(f),this.setAttribute("position",new ft(g,3)),this.setAttribute("normal",new ft(_,3)),this.setAttribute("uv",new ft(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new qs(e.width,e.height,e.widthSegments,e.heightSegments)}}class Fr extends Ze{constructor(e=.5,t=1,n=32,r=1,s=0,a=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:r,thetaStart:s,thetaLength:a},n=Math.max(3,n),r=Math.max(1,r);const o=[],c=[],l=[],u=[];let h=e;const d=(t-e)/r,f=new w,g=new le;for(let _=0;_<=r;_++){for(let m=0;m<=n;m++){const p=s+m/n*a;f.x=h*Math.cos(p),f.y=h*Math.sin(p),c.push(f.x,f.y,f.z),l.push(0,0,1),g.x=(f.x/t+1)/2,g.y=(f.y/t+1)/2,u.push(g.x,g.y)}h+=d}for(let _=0;_<r;_++){const m=_*(n+1);for(let p=0;p<n;p++){const T=p+m,y=T,v=T+n+1,L=T+n+2,R=T+1;o.push(y,v,R),o.push(v,L,R)}}this.setIndex(o),this.setAttribute("position",new ft(c,3)),this.setAttribute("normal",new ft(l,3)),this.setAttribute("uv",new ft(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Fr(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}}class rc extends Ze{constructor(e=1,t=32,n=16,r=0,s=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:s,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const c=Math.min(a+o,Math.PI);let l=0;const u=[],h=new w,d=new w,f=[],g=[],_=[],m=[];for(let p=0;p<=n;p++){const T=[],y=p/n;let v=0;p===0&&a===0?v=.5/t:p===n&&c===Math.PI&&(v=-.5/t);for(let L=0;L<=t;L++){const R=L/t;h.x=-e*Math.cos(r+R*s)*Math.sin(a+y*o),h.y=e*Math.cos(a+y*o),h.z=e*Math.sin(r+R*s)*Math.sin(a+y*o),g.push(h.x,h.y,h.z),d.copy(h).normalize(),_.push(d.x,d.y,d.z),m.push(R+v,1-y),T.push(l++)}u.push(T)}for(let p=0;p<n;p++)for(let T=0;T<t;T++){const y=u[p][T+1],v=u[p][T],L=u[p+1][T],R=u[p+1][T+1];(p!==0||a>0)&&f.push(y,v,R),(p!==n-1||c<Math.PI)&&f.push(v,L,R)}this.setIndex(f),this.setAttribute("position",new ft(g,3)),this.setAttribute("normal",new ft(_,3)),this.setAttribute("uv",new ft(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new rc(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class ep extends lr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=_d,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class tp extends lr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class np extends gu{constructor(e=-1,t=1,n=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=n-e,a=n+e,o=r+t,c=r-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,a=s+l*this.view.width,o-=u*this.view.offsetY,c=o-u*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class ip extends rn{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e,this.index=0}}class rp{constructor(e=1,t=0,n=0){return this.radius=e,this.phi=t,this.theta=n,this}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Ye(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(Ye(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class sp extends Gt{constructor(e=10,t=10,n=4473924,r=8947848){n=new tt(n),r=new tt(r);const s=t/2,a=e/t,o=e/2,c=[],l=[];for(let d=0,f=0,g=-o;d<=t;d++,g+=a){c.push(-o,0,g,o,0,g),c.push(g,0,-o,g,0,o);const _=d===s?n:r;_.toArray(l,f),f+=3,_.toArray(l,f),f+=3,_.toArray(l,f),f+=3,_.toArray(l,f),f+=3}const u=new Ze;u.setAttribute("position",new ft(c,3)),u.setAttribute("color",new ft(l,3));const h=new Ke({vertexColors:!0,toneMapped:!1});super(u,h),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}function cl(i,e,t,n){const r=ap(n);switch(t){case Jl:return i*e;case eu:return i*e;case tu:return i*e*2;case nu:return i*e/r.components*r.byteLength;case Ko:return i*e/r.components*r.byteLength;case iu:return i*e*2/r.components*r.byteLength;case jo:return i*e*2/r.components*r.byteLength;case Ql:return i*e*3/r.components*r.byteLength;case fn:return i*e*4/r.components*r.byteLength;case Jo:return i*e*4/r.components*r.byteLength;case Ss:case Es:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Ts:case bs:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case co:case uo:return Math.max(i,16)*Math.max(e,8)/4;case oo:case lo:return Math.max(i,8)*Math.max(e,8)/2;case ho:case fo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case po:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case mo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case go:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case _o:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case vo:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case xo:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case Mo:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case yo:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case So:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Eo:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case To:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case bo:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Ao:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case wo:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Ro:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case As:case Co:case Po:return Math.ceil(i/4)*Math.ceil(e/4)*16;case ru:case Lo:return Math.ceil(i/4)*Math.ceil(e/4)*8;case Io:case Do:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function ap(i){switch(i){case Un:case $l:return{byteLength:1,components:1};case Lr:case Kl:case Or:return{byteLength:2,components:1};case Zo:case $o:return{byteLength:2,components:4};case gi:case qo:case Ln:return{byteLength:4,components:1};case jl:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Yo}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Yo);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Cu(){let i=null,e=!1,t=null,n=null;function r(s,a){t(s,a),n=i.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(r),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){i=s}}}function op(i){const e=new WeakMap;function t(o,c){const l=o.array,u=o.usage,h=l.byteLength,d=i.createBuffer();i.bindBuffer(c,d),i.bufferData(c,l,u),o.onUploadCallback();let f;if(l instanceof Float32Array)f=i.FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=i.SHORT;else if(l instanceof Uint32Array)f=i.UNSIGNED_INT;else if(l instanceof Int32Array)f=i.INT;else if(l instanceof Int8Array)f=i.BYTE;else if(l instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:d,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:h}}function n(o,c,l){const u=c.array,h=c.updateRanges;if(i.bindBuffer(l,o),h.length===0)i.bufferSubData(l,0,u);else{h.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<h.length;f++){const g=h[d],_=h[f];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++d,h[d]=_)}h.length=d+1;for(let f=0,g=h.length;f<g;f++){const _=h[f];i.bufferSubData(l,_.start*u.BYTES_PER_ELEMENT,u,_.start,_.count)}c.clearUpdateRanges()}c.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);const c=e.get(o);c&&(i.deleteBuffer(c.buffer),e.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const u=e.get(o);(!u||u.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const l=e.get(o);if(l===void 0)e.set(o,t(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:r,remove:s,update:a}}var cp=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,lp=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,up=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,hp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,dp=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,fp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,pp=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,mp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,gp=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,_p=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,vp=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,xp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Mp=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,yp=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Sp=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Ep=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Tp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,bp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Ap=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,wp=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Rp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Cp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Pp=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Lp=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Ip=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Dp=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Np=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Up=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Fp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Op=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,kp="gl_FragColor = linearToOutputTexel( gl_FragColor );",Bp=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,zp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Gp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Vp=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Hp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Wp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Xp=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Yp=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,qp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Zp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,$p=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Kp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,jp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Jp=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Qp=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,em=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,tm=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,nm=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,im=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,rm=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,sm=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,am=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,om=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,cm=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lm=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,um=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,hm=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,dm=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,fm=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,pm=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,mm=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,gm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,_m=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,vm=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,xm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Mm=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,ym=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Sm=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Em=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Tm=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,bm=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Am=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,wm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Rm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Cm=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Pm=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Lm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Im=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Dm=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Nm=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Um=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Fm=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Om=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,km=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Bm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,zm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Gm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Vm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Hm=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,Wm=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Xm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Ym=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,qm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Zm=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,$m=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Km=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,jm=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Jm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Qm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,eg=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,tg=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,ng=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,ig=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,rg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,sg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,ag=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const og=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,cg=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,lg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ug=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,hg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,dg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,fg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,pg=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,mg=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,gg=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,_g=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,vg=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,xg=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Mg=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,yg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Sg=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Eg=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Tg=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bg=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Ag=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,wg=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Rg=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Cg=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Pg=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lg=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Ig=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Dg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ng=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ug=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Fg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Og=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,kg=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Bg=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,zg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Xe={alphahash_fragment:cp,alphahash_pars_fragment:lp,alphamap_fragment:up,alphamap_pars_fragment:hp,alphatest_fragment:dp,alphatest_pars_fragment:fp,aomap_fragment:pp,aomap_pars_fragment:mp,batching_pars_vertex:gp,batching_vertex:_p,begin_vertex:vp,beginnormal_vertex:xp,bsdfs:Mp,iridescence_fragment:yp,bumpmap_pars_fragment:Sp,clipping_planes_fragment:Ep,clipping_planes_pars_fragment:Tp,clipping_planes_pars_vertex:bp,clipping_planes_vertex:Ap,color_fragment:wp,color_pars_fragment:Rp,color_pars_vertex:Cp,color_vertex:Pp,common:Lp,cube_uv_reflection_fragment:Ip,defaultnormal_vertex:Dp,displacementmap_pars_vertex:Np,displacementmap_vertex:Up,emissivemap_fragment:Fp,emissivemap_pars_fragment:Op,colorspace_fragment:kp,colorspace_pars_fragment:Bp,envmap_fragment:zp,envmap_common_pars_fragment:Gp,envmap_pars_fragment:Vp,envmap_pars_vertex:Hp,envmap_physical_pars_fragment:em,envmap_vertex:Wp,fog_vertex:Xp,fog_pars_vertex:Yp,fog_fragment:qp,fog_pars_fragment:Zp,gradientmap_pars_fragment:$p,lightmap_pars_fragment:Kp,lights_lambert_fragment:jp,lights_lambert_pars_fragment:Jp,lights_pars_begin:Qp,lights_toon_fragment:tm,lights_toon_pars_fragment:nm,lights_phong_fragment:im,lights_phong_pars_fragment:rm,lights_physical_fragment:sm,lights_physical_pars_fragment:am,lights_fragment_begin:om,lights_fragment_maps:cm,lights_fragment_end:lm,logdepthbuf_fragment:um,logdepthbuf_pars_fragment:hm,logdepthbuf_pars_vertex:dm,logdepthbuf_vertex:fm,map_fragment:pm,map_pars_fragment:mm,map_particle_fragment:gm,map_particle_pars_fragment:_m,metalnessmap_fragment:vm,metalnessmap_pars_fragment:xm,morphinstance_vertex:Mm,morphcolor_vertex:ym,morphnormal_vertex:Sm,morphtarget_pars_vertex:Em,morphtarget_vertex:Tm,normal_fragment_begin:bm,normal_fragment_maps:Am,normal_pars_fragment:wm,normal_pars_vertex:Rm,normal_vertex:Cm,normalmap_pars_fragment:Pm,clearcoat_normal_fragment_begin:Lm,clearcoat_normal_fragment_maps:Im,clearcoat_pars_fragment:Dm,iridescence_pars_fragment:Nm,opaque_fragment:Um,packing:Fm,premultiplied_alpha_fragment:Om,project_vertex:km,dithering_fragment:Bm,dithering_pars_fragment:zm,roughnessmap_fragment:Gm,roughnessmap_pars_fragment:Vm,shadowmap_pars_fragment:Hm,shadowmap_pars_vertex:Wm,shadowmap_vertex:Xm,shadowmask_pars_fragment:Ym,skinbase_vertex:qm,skinning_pars_vertex:Zm,skinning_vertex:$m,skinnormal_vertex:Km,specularmap_fragment:jm,specularmap_pars_fragment:Jm,tonemapping_fragment:Qm,tonemapping_pars_fragment:eg,transmission_fragment:tg,transmission_pars_fragment:ng,uv_pars_fragment:ig,uv_pars_vertex:rg,uv_vertex:sg,worldpos_vertex:ag,background_vert:og,background_frag:cg,backgroundCube_vert:lg,backgroundCube_frag:ug,cube_vert:hg,cube_frag:dg,depth_vert:fg,depth_frag:pg,distanceRGBA_vert:mg,distanceRGBA_frag:gg,equirect_vert:_g,equirect_frag:vg,linedashed_vert:xg,linedashed_frag:Mg,meshbasic_vert:yg,meshbasic_frag:Sg,meshlambert_vert:Eg,meshlambert_frag:Tg,meshmatcap_vert:bg,meshmatcap_frag:Ag,meshnormal_vert:wg,meshnormal_frag:Rg,meshphong_vert:Cg,meshphong_frag:Pg,meshphysical_vert:Lg,meshphysical_frag:Ig,meshtoon_vert:Dg,meshtoon_frag:Ng,points_vert:Ug,points_frag:Fg,shadow_vert:Og,shadow_frag:kg,sprite_vert:Bg,sprite_frag:zg},ue={common:{diffuse:{value:new tt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new He},alphaMap:{value:null},alphaMapTransform:{value:new He},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new He}},envmap:{envMap:{value:null},envMapRotation:{value:new He},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new He}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new He}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new He},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new He},normalScale:{value:new le(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new He},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new He}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new He}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new He}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new tt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new tt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new He},alphaTest:{value:0},uvTransform:{value:new He}},sprite:{diffuse:{value:new tt(16777215)},opacity:{value:1},center:{value:new le(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new He},alphaMap:{value:null},alphaMapTransform:{value:new He},alphaTest:{value:0}}},gn={basic:{uniforms:zt([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.fog]),vertexShader:Xe.meshbasic_vert,fragmentShader:Xe.meshbasic_frag},lambert:{uniforms:zt([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,ue.lights,{emissive:{value:new tt(0)}}]),vertexShader:Xe.meshlambert_vert,fragmentShader:Xe.meshlambert_frag},phong:{uniforms:zt([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,ue.lights,{emissive:{value:new tt(0)},specular:{value:new tt(1118481)},shininess:{value:30}}]),vertexShader:Xe.meshphong_vert,fragmentShader:Xe.meshphong_frag},standard:{uniforms:zt([ue.common,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.roughnessmap,ue.metalnessmap,ue.fog,ue.lights,{emissive:{value:new tt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Xe.meshphysical_vert,fragmentShader:Xe.meshphysical_frag},toon:{uniforms:zt([ue.common,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.gradientmap,ue.fog,ue.lights,{emissive:{value:new tt(0)}}]),vertexShader:Xe.meshtoon_vert,fragmentShader:Xe.meshtoon_frag},matcap:{uniforms:zt([ue.common,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,{matcap:{value:null}}]),vertexShader:Xe.meshmatcap_vert,fragmentShader:Xe.meshmatcap_frag},points:{uniforms:zt([ue.points,ue.fog]),vertexShader:Xe.points_vert,fragmentShader:Xe.points_frag},dashed:{uniforms:zt([ue.common,ue.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Xe.linedashed_vert,fragmentShader:Xe.linedashed_frag},depth:{uniforms:zt([ue.common,ue.displacementmap]),vertexShader:Xe.depth_vert,fragmentShader:Xe.depth_frag},normal:{uniforms:zt([ue.common,ue.bumpmap,ue.normalmap,ue.displacementmap,{opacity:{value:1}}]),vertexShader:Xe.meshnormal_vert,fragmentShader:Xe.meshnormal_frag},sprite:{uniforms:zt([ue.sprite,ue.fog]),vertexShader:Xe.sprite_vert,fragmentShader:Xe.sprite_frag},background:{uniforms:{uvTransform:{value:new He},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Xe.background_vert,fragmentShader:Xe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new He}},vertexShader:Xe.backgroundCube_vert,fragmentShader:Xe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Xe.cube_vert,fragmentShader:Xe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Xe.equirect_vert,fragmentShader:Xe.equirect_frag},distanceRGBA:{uniforms:zt([ue.common,ue.displacementmap,{referencePosition:{value:new w},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Xe.distanceRGBA_vert,fragmentShader:Xe.distanceRGBA_frag},shadow:{uniforms:zt([ue.lights,ue.fog,{color:{value:new tt(0)},opacity:{value:1}}]),vertexShader:Xe.shadow_vert,fragmentShader:Xe.shadow_frag}};gn.physical={uniforms:zt([gn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new He},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new He},clearcoatNormalScale:{value:new le(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new He},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new He},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new He},sheen:{value:0},sheenColor:{value:new tt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new He},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new He},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new He},transmissionSamplerSize:{value:new le},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new He},attenuationDistance:{value:0},attenuationColor:{value:new tt(0)},specularColor:{value:new tt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new He},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new He},anisotropyVector:{value:new le},anisotropyMap:{value:null},anisotropyMapTransform:{value:new He}}]),vertexShader:Xe.meshphysical_vert,fragmentShader:Xe.meshphysical_frag};const vs={r:0,b:0,g:0},oi=new Fn,Gg=new St;function Vg(i,e,t,n,r,s,a){const o=new tt(0);let c=s===!0?0:1,l,u,h=null,d=0,f=null;function g(y){let v=y.isScene===!0?y.background:null;return v&&v.isTexture&&(v=(y.backgroundBlurriness>0?t:e).get(v)),v}function _(y){let v=!1;const L=g(y);L===null?p(o,c):L&&L.isColor&&(p(L,1),v=!0);const R=i.xr.getEnvironmentBlendMode();R==="additive"?n.buffers.color.setClear(0,0,0,1,a):R==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||v)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(y,v){const L=g(v);L&&(L.isCubeTexture||L.mapping===Vs)?(u===void 0&&(u=new mt(new xi(1,1,1),new ei({name:"BackgroundCubeMaterial",uniforms:ar(gn.backgroundCube.uniforms),vertexShader:gn.backgroundCube.vertexShader,fragmentShader:gn.backgroundCube.fragmentShader,side:Zt,depthTest:!1,depthWrite:!1,fog:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(R,C,I){this.matrixWorld.copyPosition(I.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),oi.copy(v.backgroundRotation),oi.x*=-1,oi.y*=-1,oi.z*=-1,L.isCubeTexture&&L.isRenderTargetTexture===!1&&(oi.y*=-1,oi.z*=-1),u.material.uniforms.envMap.value=L,u.material.uniforms.flipEnvMap.value=L.isCubeTexture&&L.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=v.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(Gg.makeRotationFromEuler(oi)),u.material.toneMapped=st.getTransfer(L.colorSpace)!==pt,(h!==L||d!==L.version||f!==i.toneMapping)&&(u.material.needsUpdate=!0,h=L,d=L.version,f=i.toneMapping),u.layers.enableAll(),y.unshift(u,u.geometry,u.material,0,0,null)):L&&L.isTexture&&(l===void 0&&(l=new mt(new qs(2,2),new ei({name:"BackgroundMaterial",uniforms:ar(gn.background.uniforms),vertexShader:gn.background.vertexShader,fragmentShader:gn.background.fragmentShader,side:Qn,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(l)),l.material.uniforms.t2D.value=L,l.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,l.material.toneMapped=st.getTransfer(L.colorSpace)!==pt,L.matrixAutoUpdate===!0&&L.updateMatrix(),l.material.uniforms.uvTransform.value.copy(L.matrix),(h!==L||d!==L.version||f!==i.toneMapping)&&(l.material.needsUpdate=!0,h=L,d=L.version,f=i.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function p(y,v){y.getRGB(vs,mu(i)),n.buffers.color.setClear(vs.r,vs.g,vs.b,v,a)}function T(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(y,v=1){o.set(y),c=v,p(o,c)},getClearAlpha:function(){return c},setClearAlpha:function(y){c=y,p(o,c)},render:_,addToRenderList:m,dispose:T}}function Hg(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},r=d(null);let s=r,a=!1;function o(x,P,z,U,B){let X=!1;const G=h(U,z,P);s!==G&&(s=G,l(s.object)),X=f(x,U,z,B),X&&g(x,U,z,B),B!==null&&e.update(B,i.ELEMENT_ARRAY_BUFFER),(X||a)&&(a=!1,v(x,P,z,U),B!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(B).buffer))}function c(){return i.createVertexArray()}function l(x){return i.bindVertexArray(x)}function u(x){return i.deleteVertexArray(x)}function h(x,P,z){const U=z.wireframe===!0;let B=n[x.id];B===void 0&&(B={},n[x.id]=B);let X=B[P.id];X===void 0&&(X={},B[P.id]=X);let G=X[U];return G===void 0&&(G=d(c()),X[U]=G),G}function d(x){const P=[],z=[],U=[];for(let B=0;B<t;B++)P[B]=0,z[B]=0,U[B]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:P,enabledAttributes:z,attributeDivisors:U,object:x,attributes:{},index:null}}function f(x,P,z,U){const B=s.attributes,X=P.attributes;let G=0;const K=z.getAttributes();for(const O in K)if(K[O].location>=0){const se=B[O];let ve=X[O];if(ve===void 0&&(O==="instanceMatrix"&&x.instanceMatrix&&(ve=x.instanceMatrix),O==="instanceColor"&&x.instanceColor&&(ve=x.instanceColor)),se===void 0||se.attribute!==ve||ve&&se.data!==ve.data)return!0;G++}return s.attributesNum!==G||s.index!==U}function g(x,P,z,U){const B={},X=P.attributes;let G=0;const K=z.getAttributes();for(const O in K)if(K[O].location>=0){let se=X[O];se===void 0&&(O==="instanceMatrix"&&x.instanceMatrix&&(se=x.instanceMatrix),O==="instanceColor"&&x.instanceColor&&(se=x.instanceColor));const ve={};ve.attribute=se,se&&se.data&&(ve.data=se.data),B[O]=ve,G++}s.attributes=B,s.attributesNum=G,s.index=U}function _(){const x=s.newAttributes;for(let P=0,z=x.length;P<z;P++)x[P]=0}function m(x){p(x,0)}function p(x,P){const z=s.newAttributes,U=s.enabledAttributes,B=s.attributeDivisors;z[x]=1,U[x]===0&&(i.enableVertexAttribArray(x),U[x]=1),B[x]!==P&&(i.vertexAttribDivisor(x,P),B[x]=P)}function T(){const x=s.newAttributes,P=s.enabledAttributes;for(let z=0,U=P.length;z<U;z++)P[z]!==x[z]&&(i.disableVertexAttribArray(z),P[z]=0)}function y(x,P,z,U,B,X,G){G===!0?i.vertexAttribIPointer(x,P,z,B,X):i.vertexAttribPointer(x,P,z,U,B,X)}function v(x,P,z,U){_();const B=U.attributes,X=z.getAttributes(),G=P.defaultAttributeValues;for(const K in X){const O=X[K];if(O.location>=0){let J=B[K];if(J===void 0&&(K==="instanceMatrix"&&x.instanceMatrix&&(J=x.instanceMatrix),K==="instanceColor"&&x.instanceColor&&(J=x.instanceColor)),J!==void 0){const se=J.normalized,ve=J.itemSize,Ue=e.get(J);if(Ue===void 0)continue;const Qe=Ue.buffer,Y=Ue.type,ae=Ue.bytesPerElement,Ae=Y===i.INT||Y===i.UNSIGNED_INT||J.gpuType===qo;if(J.isInterleavedBufferAttribute){const ce=J.data,Le=ce.stride,nt=J.offset;if(ce.isInstancedInterleavedBuffer){for(let Pe=0;Pe<O.locationSize;Pe++)p(O.location+Pe,ce.meshPerAttribute);x.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=ce.meshPerAttribute*ce.count)}else for(let Pe=0;Pe<O.locationSize;Pe++)m(O.location+Pe);i.bindBuffer(i.ARRAY_BUFFER,Qe);for(let Pe=0;Pe<O.locationSize;Pe++)y(O.location+Pe,ve/O.locationSize,Y,se,Le*ae,(nt+ve/O.locationSize*Pe)*ae,Ae)}else{if(J.isInstancedBufferAttribute){for(let ce=0;ce<O.locationSize;ce++)p(O.location+ce,J.meshPerAttribute);x.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let ce=0;ce<O.locationSize;ce++)m(O.location+ce);i.bindBuffer(i.ARRAY_BUFFER,Qe);for(let ce=0;ce<O.locationSize;ce++)y(O.location+ce,ve/O.locationSize,Y,se,ve*ae,ve/O.locationSize*ce*ae,Ae)}}else if(G!==void 0){const se=G[K];if(se!==void 0)switch(se.length){case 2:i.vertexAttrib2fv(O.location,se);break;case 3:i.vertexAttrib3fv(O.location,se);break;case 4:i.vertexAttrib4fv(O.location,se);break;default:i.vertexAttrib1fv(O.location,se)}}}}T()}function L(){I();for(const x in n){const P=n[x];for(const z in P){const U=P[z];for(const B in U)u(U[B].object),delete U[B];delete P[z]}delete n[x]}}function R(x){if(n[x.id]===void 0)return;const P=n[x.id];for(const z in P){const U=P[z];for(const B in U)u(U[B].object),delete U[B];delete P[z]}delete n[x.id]}function C(x){for(const P in n){const z=n[P];if(z[x.id]===void 0)continue;const U=z[x.id];for(const B in U)u(U[B].object),delete U[B];delete z[x.id]}}function I(){E(),a=!0,s!==r&&(s=r,l(s.object))}function E(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:I,resetDefaultState:E,dispose:L,releaseStatesOfGeometry:R,releaseStatesOfProgram:C,initAttributes:_,enableAttribute:m,disableUnusedAttributes:T}}function Wg(i,e,t){let n;function r(l){n=l}function s(l,u){i.drawArrays(n,l,u),t.update(u,n,1)}function a(l,u,h){h!==0&&(i.drawArraysInstanced(n,l,u,h),t.update(u,n,h))}function o(l,u,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,u,0,h);let f=0;for(let g=0;g<h;g++)f+=u[g];t.update(f,n,1)}function c(l,u,h,d){if(h===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<l.length;g++)a(l[g],u[g],d[g]);else{f.multiDrawArraysInstancedWEBGL(n,l,0,u,0,d,0,h);let g=0;for(let _=0;_<h;_++)g+=u[_]*d[_];t.update(g,n,1)}}this.setMode=r,this.render=s,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=c}function Xg(i,e,t,n){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const C=e.get("EXT_texture_filter_anisotropic");r=i.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(C){return!(C!==fn&&n.convert(C)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(C){const I=C===Or&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(C!==Un&&n.convert(C)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&C!==Ln&&!I)}function c(C){if(C==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const u=c(l);u!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",u,"instead."),l=u);const h=t.logarithmicDepthBuffer===!0,d=t.reverseDepthBuffer===!0&&e.has("EXT_clip_control"),f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),T=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),y=i.getParameter(i.MAX_VARYING_VECTORS),v=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),L=g>0,R=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:h,reverseDepthBuffer:d,maxTextures:f,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:T,maxVaryings:y,maxFragmentUniforms:v,vertexTextures:L,maxSamples:R}}function Yg(i){const e=this;let t=null,n=0,r=!1,s=!1;const a=new li,o=new He,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(h,d){const f=h.length!==0||d||n!==0||r;return r=d,n=h.length,f},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,d){t=u(h,d,0)},this.setState=function(h,d,f){const g=h.clippingPlanes,_=h.clipIntersection,m=h.clipShadows,p=i.get(h);if(!r||g===null||g.length===0||s&&!m)s?u(null):l();else{const T=s?0:n,y=T*4;let v=p.clippingState||null;c.value=v,v=u(g,d,y,f);for(let L=0;L!==y;++L)v[L]=t[L];p.clippingState=v,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=T}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function u(h,d,f,g){const _=h!==null?h.length:0;let m=null;if(_!==0){if(m=c.value,g!==!0||m===null){const p=f+_*4,T=d.matrixWorldInverse;o.getNormalMatrix(T),(m===null||m.length<p)&&(m=new Float32Array(p));for(let y=0,v=f;y!==_;++y,v+=4)a.copy(h[y]).applyMatrix4(T,o),a.normal.toArray(m,v),m[v+3]=a.constant}c.value=m,c.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,m}}function qg(i){let e=new WeakMap;function t(a,o){return o===io?a.mapping=tr:o===ro&&(a.mapping=nr),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===io||o===ro)if(e.has(a)){const c=e.get(a).texture;return t(c,a.mapping)}else{const c=a.image;if(c&&c.height>0){const l=new _f(c.height);return l.fromEquirectangularTexture(i,a),e.set(a,l),a.addEventListener("dispose",r),t(l.texture,a.mapping)}else return null}}return a}function r(a){const o=a.target;o.removeEventListener("dispose",r);const c=e.get(o);c!==void 0&&(e.delete(o),c.dispose())}function s(){e=new WeakMap}return{get:n,dispose:s}}const Wi=4,ll=[.125,.215,.35,.446,.526,.582],di=20,Aa=new np,ul=new tt;let wa=null,Ra=0,Ca=0,Pa=!1;const ui=(1+Math.sqrt(5))/2,Bi=1/ui,hl=[new w(-ui,Bi,0),new w(ui,Bi,0),new w(-Bi,0,ui),new w(Bi,0,ui),new w(0,ui,-Bi),new w(0,ui,Bi),new w(-1,1,-1),new w(1,1,-1),new w(-1,1,1),new w(1,1,1)];class dl{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,r=100){wa=this._renderer.getRenderTarget(),Ra=this._renderer.getActiveCubeFace(),Ca=this._renderer.getActiveMipmapLevel(),Pa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ml(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=pl(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(wa,Ra,Ca),this._renderer.xr.enabled=Pa,e.scissorTest=!1,xs(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===tr||e.mapping===nr?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),wa=this._renderer.getRenderTarget(),Ra=this._renderer.getActiveCubeFace(),Ca=this._renderer.getActiveMipmapLevel(),Pa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:qt,minFilter:qt,generateMipmaps:!1,type:Or,format:fn,colorSpace:sr,depthBuffer:!1},r=fl(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=fl(e,t,n);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Zg(s)),this._blurMaterial=$g(s,e,t)}return r}_compileMaterial(e){const t=new mt(this._lodPlanes[0],e);this._renderer.compile(t,Aa)}_sceneToCubeUV(e,t,n,r){const o=new rn(90,1,t,n),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],u=this._renderer,h=u.autoClear,d=u.toneMapping;u.getClearColor(ul),u.toneMapping=jn,u.autoClear=!1;const f=new _t({name:"PMREM.Background",side:Zt,depthWrite:!1,depthTest:!1}),g=new mt(new xi,f);let _=!1;const m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,_=!0):(f.color.copy(ul),_=!0);for(let p=0;p<6;p++){const T=p%3;T===0?(o.up.set(0,c[p],0),o.lookAt(l[p],0,0)):T===1?(o.up.set(0,0,c[p]),o.lookAt(0,l[p],0)):(o.up.set(0,c[p],0),o.lookAt(0,0,l[p]));const y=this._cubeSize;xs(r,T*y,p>2?y:0,y,y),u.setRenderTarget(r),_&&u.render(g,o),u.render(e,o)}g.geometry.dispose(),g.material.dispose(),u.toneMapping=d,u.autoClear=h,e.background=m}_textureToCubeUV(e,t){const n=this._renderer,r=e.mapping===tr||e.mapping===nr;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=ml()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=pl());const s=r?this._cubemapMaterial:this._equirectMaterial,a=new mt(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=e;const c=this._cubeSize;xs(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(a,Aa)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const a=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),o=hl[(r-s-1)%hl.length];this._blur(e,s-1,s,a,o)}t.autoClear=n}_blur(e,t,n,r,s){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,"latitudinal",s),this._halfBlur(a,e,n,n,r,"longitudinal",s)}_halfBlur(e,t,n,r,s,a,o){const c=this._renderer,l=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,h=new mt(this._lodPlanes[r],l),d=l.uniforms,f=this._sizeLods[n]-1,g=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*di-1),_=s/g,m=isFinite(s)?1+Math.floor(u*_):di;m>di&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${di}`);const p=[];let T=0;for(let C=0;C<di;++C){const I=C/_,E=Math.exp(-I*I/2);p.push(E),C===0?T+=E:C<m&&(T+=2*E)}for(let C=0;C<p.length;C++)p[C]=p[C]/T;d.envMap.value=e.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=a==="latitudinal",o&&(d.poleAxis.value=o);const{_lodMax:y}=this;d.dTheta.value=g,d.mipInt.value=y-n;const v=this._sizeLods[r],L=3*v*(r>y-Wi?r-y+Wi:0),R=4*(this._cubeSize-v);xs(t,L,R,3*v,2*v),c.setRenderTarget(t),c.render(h,Aa)}}function Zg(i){const e=[],t=[],n=[];let r=i;const s=i-Wi+1+ll.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);t.push(o);let c=1/o;a>i-Wi?c=ll[a-i+Wi-1]:a===0&&(c=0),n.push(c);const l=1/(o-2),u=-l,h=1+l,d=[u,u,h,u,h,h,u,u,h,h,u,h],f=6,g=6,_=3,m=2,p=1,T=new Float32Array(_*g*f),y=new Float32Array(m*g*f),v=new Float32Array(p*g*f);for(let R=0;R<f;R++){const C=R%3*2/3-1,I=R>2?0:-1,E=[C,I,0,C+2/3,I,0,C+2/3,I+1,0,C,I,0,C+2/3,I+1,0,C,I+1,0];T.set(E,_*g*R),y.set(d,m*g*R);const x=[R,R,R,R,R,R];v.set(x,p*g*R)}const L=new Ze;L.setAttribute("position",new Ht(T,_)),L.setAttribute("uv",new Ht(y,m)),L.setAttribute("faceIndex",new Ht(v,p)),e.push(L),r>Wi&&r--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function fl(i,e,t){const n=new _i(i,e,t);return n.texture.mapping=Vs,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function xs(i,e,t,n,r){i.viewport.set(e,t,n,r),i.scissor.set(e,t,n,r)}function $g(i,e,t){const n=new Float32Array(di),r=new w(0,1,0);return new ei({name:"SphericalGaussianBlur",defines:{n:di,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:sc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function pl(){return new ei({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:sc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function ml(){return new ei({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:sc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function sc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Kg(i){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){const c=o.mapping,l=c===io||c===ro,u=c===tr||c===nr;if(l||u){let h=e.get(o);const d=h!==void 0?h.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==d)return t===null&&(t=new dl(i)),h=l?t.fromEquirectangular(o,h):t.fromCubemap(o,h),h.texture.pmremVersion=o.pmremVersion,e.set(o,h),h.texture;if(h!==void 0)return h.texture;{const f=o.image;return l&&f&&f.height>0||u&&f&&r(f)?(t===null&&(t=new dl(i)),h=l?t.fromEquirectangular(o):t.fromCubemap(o),h.texture.pmremVersion=o.pmremVersion,e.set(o,h),o.addEventListener("dispose",s),h.texture):null}}}return o}function r(o){let c=0;const l=6;for(let u=0;u<l;u++)o[u]!==void 0&&c++;return c===l}function s(o){const c=o.target;c.removeEventListener("dispose",s);const l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function jg(i){const e={};function t(n){if(e[n]!==void 0)return e[n];let r;switch(n){case"WEBGL_depth_texture":r=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=i.getExtension(n)}return e[n]=r,r}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const r=t(n);return r===null&&Vi("THREE.WebGLRenderer: "+n+" extension not supported."),r}}}function Jg(i,e,t,n){const r={},s=new WeakMap;function a(h){const d=h.target;d.index!==null&&e.remove(d.index);for(const g in d.attributes)e.remove(d.attributes[g]);d.removeEventListener("dispose",a),delete r[d.id];const f=s.get(d);f&&(e.remove(f),s.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function o(h,d){return r[d.id]===!0||(d.addEventListener("dispose",a),r[d.id]=!0,t.memory.geometries++),d}function c(h){const d=h.attributes;for(const f in d)e.update(d[f],i.ARRAY_BUFFER)}function l(h){const d=[],f=h.index,g=h.attributes.position;let _=0;if(f!==null){const T=f.array;_=f.version;for(let y=0,v=T.length;y<v;y+=3){const L=T[y+0],R=T[y+1],C=T[y+2];d.push(L,R,R,C,C,L)}}else if(g!==void 0){const T=g.array;_=g.version;for(let y=0,v=T.length/3-1;y<v;y+=3){const L=y+0,R=y+1,C=y+2;d.push(L,R,R,C,C,L)}}else return;const m=new(ou(d)?pu:fu)(d,1);m.version=_;const p=s.get(h);p&&e.remove(p),s.set(h,m)}function u(h){const d=s.get(h);if(d){const f=h.index;f!==null&&d.version<f.version&&l(h)}else l(h);return s.get(h)}return{get:o,update:c,getWireframeAttribute:u}}function Qg(i,e,t){let n;function r(d){n=d}let s,a;function o(d){s=d.type,a=d.bytesPerElement}function c(d,f){i.drawElements(n,f,s,d*a),t.update(f,n,1)}function l(d,f,g){g!==0&&(i.drawElementsInstanced(n,f,s,d*a,g),t.update(f,n,g))}function u(d,f,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,s,d,0,g);let m=0;for(let p=0;p<g;p++)m+=f[p];t.update(m,n,1)}function h(d,f,g,_){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<d.length;p++)l(d[p]/a,f[p],_[p]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,s,d,0,_,0,g);let p=0;for(let T=0;T<g;T++)p+=f[T]*_[T];t.update(p,n,1)}}this.setMode=r,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=u,this.renderMultiDrawInstances=h}function e_(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(s/3);break;case i.LINES:t.lines+=o*(s/2);break;case i.LINE_STRIP:t.lines+=o*(s-1);break;case i.LINE_LOOP:t.lines+=o*s;break;case i.POINTS:t.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:n}}function t_(i,e,t){const n=new WeakMap,r=new At;function s(a,o,c){const l=a.morphTargetInfluences,u=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,h=u!==void 0?u.length:0;let d=n.get(o);if(d===void 0||d.count!==h){let E=function(){C.dispose(),n.delete(o),o.removeEventListener("dispose",E)};d!==void 0&&d.texture.dispose();const f=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,_=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],T=o.morphAttributes.color||[];let y=0;f===!0&&(y=1),g===!0&&(y=2),_===!0&&(y=3);let v=o.attributes.position.count*y,L=1;v>e.maxTextureSize&&(L=Math.ceil(v/e.maxTextureSize),v=e.maxTextureSize);const R=new Float32Array(v*L*4*h),C=new lu(R,v,L,h);C.type=Ln,C.needsUpdate=!0;const I=y*4;for(let x=0;x<h;x++){const P=m[x],z=p[x],U=T[x],B=v*L*4*x;for(let X=0;X<P.count;X++){const G=X*I;f===!0&&(r.fromBufferAttribute(P,X),R[B+G+0]=r.x,R[B+G+1]=r.y,R[B+G+2]=r.z,R[B+G+3]=0),g===!0&&(r.fromBufferAttribute(z,X),R[B+G+4]=r.x,R[B+G+5]=r.y,R[B+G+6]=r.z,R[B+G+7]=0),_===!0&&(r.fromBufferAttribute(U,X),R[B+G+8]=r.x,R[B+G+9]=r.y,R[B+G+10]=r.z,R[B+G+11]=U.itemSize===4?r.w:1)}}d={count:h,texture:C,size:new le(v,L)},n.set(o,d),o.addEventListener("dispose",E)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let f=0;for(let _=0;_<l.length;_++)f+=l[_];const g=o.morphTargetsRelative?1:1-f;c.getUniforms().setValue(i,"morphTargetBaseInfluence",g),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",d.texture,t),c.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:s}}function n_(i,e,t,n){let r=new WeakMap;function s(c){const l=n.render.frame,u=c.geometry,h=e.get(c,u);if(r.get(h)!==l&&(e.update(h),r.set(h,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",o)===!1&&c.addEventListener("dispose",o),r.get(c)!==l&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,l))),c.isSkinnedMesh){const d=c.skeleton;r.get(d)!==l&&(d.update(),r.set(d,l))}return h}function a(){r=new WeakMap}function o(c){const l=c.target;l.removeEventListener("dispose",o),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:s,dispose:a}}const Pu=new Nt,gl=new yu(1,1),Lu=new lu,Iu=new Qd,Du=new _u,_l=[],vl=[],xl=new Float32Array(16),Ml=new Float32Array(9),yl=new Float32Array(4);function ur(i,e,t){const n=i[0];if(n<=0||n>0)return i;const r=e*t;let s=_l[r];if(s===void 0&&(s=new Float32Array(r),_l[r]=s),e!==0){n.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(s,o)}return s}function Pt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function Lt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Zs(i,e){let t=vl[e];t===void 0&&(t=new Int32Array(e),vl[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function i_(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function r_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2fv(this.addr,e),Lt(t,e)}}function s_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Pt(t,e))return;i.uniform3fv(this.addr,e),Lt(t,e)}}function a_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4fv(this.addr,e),Lt(t,e)}}function o_(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Lt(t,e)}else{if(Pt(t,n))return;yl.set(n),i.uniformMatrix2fv(this.addr,!1,yl),Lt(t,n)}}function c_(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Lt(t,e)}else{if(Pt(t,n))return;Ml.set(n),i.uniformMatrix3fv(this.addr,!1,Ml),Lt(t,n)}}function l_(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Lt(t,e)}else{if(Pt(t,n))return;xl.set(n),i.uniformMatrix4fv(this.addr,!1,xl),Lt(t,n)}}function u_(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function h_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2iv(this.addr,e),Lt(t,e)}}function d_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;i.uniform3iv(this.addr,e),Lt(t,e)}}function f_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4iv(this.addr,e),Lt(t,e)}}function p_(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function m_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2uiv(this.addr,e),Lt(t,e)}}function g_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;i.uniform3uiv(this.addr,e),Lt(t,e)}}function __(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4uiv(this.addr,e),Lt(t,e)}}function v_(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);let s;this.type===i.SAMPLER_2D_SHADOW?(gl.compareFunction=su,s=gl):s=Pu,t.setTexture2D(e||s,r)}function x_(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture3D(e||Iu,r)}function M_(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTextureCube(e||Du,r)}function y_(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture2DArray(e||Lu,r)}function S_(i){switch(i){case 5126:return i_;case 35664:return r_;case 35665:return s_;case 35666:return a_;case 35674:return o_;case 35675:return c_;case 35676:return l_;case 5124:case 35670:return u_;case 35667:case 35671:return h_;case 35668:case 35672:return d_;case 35669:case 35673:return f_;case 5125:return p_;case 36294:return m_;case 36295:return g_;case 36296:return __;case 35678:case 36198:case 36298:case 36306:case 35682:return v_;case 35679:case 36299:case 36307:return x_;case 35680:case 36300:case 36308:case 36293:return M_;case 36289:case 36303:case 36311:case 36292:return y_}}function E_(i,e){i.uniform1fv(this.addr,e)}function T_(i,e){const t=ur(e,this.size,2);i.uniform2fv(this.addr,t)}function b_(i,e){const t=ur(e,this.size,3);i.uniform3fv(this.addr,t)}function A_(i,e){const t=ur(e,this.size,4);i.uniform4fv(this.addr,t)}function w_(i,e){const t=ur(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function R_(i,e){const t=ur(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function C_(i,e){const t=ur(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function P_(i,e){i.uniform1iv(this.addr,e)}function L_(i,e){i.uniform2iv(this.addr,e)}function I_(i,e){i.uniform3iv(this.addr,e)}function D_(i,e){i.uniform4iv(this.addr,e)}function N_(i,e){i.uniform1uiv(this.addr,e)}function U_(i,e){i.uniform2uiv(this.addr,e)}function F_(i,e){i.uniform3uiv(this.addr,e)}function O_(i,e){i.uniform4uiv(this.addr,e)}function k_(i,e,t){const n=this.cache,r=e.length,s=Zs(t,r);Pt(n,s)||(i.uniform1iv(this.addr,s),Lt(n,s));for(let a=0;a!==r;++a)t.setTexture2D(e[a]||Pu,s[a])}function B_(i,e,t){const n=this.cache,r=e.length,s=Zs(t,r);Pt(n,s)||(i.uniform1iv(this.addr,s),Lt(n,s));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||Iu,s[a])}function z_(i,e,t){const n=this.cache,r=e.length,s=Zs(t,r);Pt(n,s)||(i.uniform1iv(this.addr,s),Lt(n,s));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||Du,s[a])}function G_(i,e,t){const n=this.cache,r=e.length,s=Zs(t,r);Pt(n,s)||(i.uniform1iv(this.addr,s),Lt(n,s));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||Lu,s[a])}function V_(i){switch(i){case 5126:return E_;case 35664:return T_;case 35665:return b_;case 35666:return A_;case 35674:return w_;case 35675:return R_;case 35676:return C_;case 5124:case 35670:return P_;case 35667:case 35671:return L_;case 35668:case 35672:return I_;case 35669:case 35673:return D_;case 5125:return N_;case 36294:return U_;case 36295:return F_;case 36296:return O_;case 35678:case 36198:case 36298:case 36306:case 35682:return k_;case 35679:case 36299:case 36307:return B_;case 35680:case 36300:case 36308:case 36293:return z_;case 36289:case 36303:case 36311:case 36292:return G_}}class H_{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=S_(t.type)}}class W_{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=V_(t.type)}}class X_{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const o=r[s];o.setValue(e,t[o.id],n)}}}const La=/(\w+)(\])?(\[|\.)?/g;function Sl(i,e){i.seq.push(e),i.map[e.id]=e}function Y_(i,e,t){const n=i.name,r=n.length;for(La.lastIndex=0;;){const s=La.exec(n),a=La.lastIndex;let o=s[1];const c=s[2]==="]",l=s[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===r){Sl(t,l===void 0?new H_(o,i,e):new W_(o,i,e));break}else{let h=t.map[o];h===void 0&&(h=new X_(o),Sl(t,h)),t=h}}}class ws{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){const s=e.getActiveUniform(t,r),a=e.getUniformLocation(t,s.name);Y_(s,a,this)}}setValue(e,t,n,r){const s=this.map[t];s!==void 0&&s.setValue(e,n,r)}setOptional(e,t,n){const r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let s=0,a=t.length;s!==a;++s){const o=t[s],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,r)}}static seqWithValue(e,t){const n=[];for(let r=0,s=e.length;r!==s;++r){const a=e[r];a.id in t&&n.push(a)}return n}}function El(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const q_=37297;let Z_=0;function $_(i,e){const t=i.split(`
`),n=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=r;a<s;a++){const o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}const Tl=new He;function K_(i){st._getMatrix(Tl,st.workingColorSpace,i);const e=`mat3( ${Tl.elements.map(t=>t.toFixed(4))} )`;switch(st.getTransfer(i)){case Ns:return[e,"LinearTransferOETF"];case pt:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function bl(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),r=i.getShaderInfoLog(e).trim();if(n&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const a=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+$_(i.getShaderSource(e),a)}else return r}function j_(i,e){const t=K_(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function J_(i,e){let t;switch(e){case ld:t="Linear";break;case ud:t="Reinhard";break;case hd:t="Cineon";break;case dd:t="ACESFilmic";break;case pd:t="AgX";break;case md:t="Neutral";break;case fd:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Ms=new w;function Q_(){st.getLuminanceCoefficients(Ms);const i=Ms.x.toFixed(4),e=Ms.y.toFixed(4),t=Ms.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function e0(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Sr).join(`
`)}function t0(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function n0(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){const s=i.getActiveAttrib(e,r),a=s.name;let o=1;s.type===i.FLOAT_MAT2&&(o=2),s.type===i.FLOAT_MAT3&&(o=3),s.type===i.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function Sr(i){return i!==""}function Al(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function wl(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const i0=/^[ \t]*#include +<([\w\d./]+)>/gm;function ko(i){return i.replace(i0,s0)}const r0=new Map;function s0(i,e){let t=Xe[e];if(t===void 0){const n=r0.get(e);if(n!==void 0)t=Xe[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return ko(t)}const a0=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Rl(i){return i.replace(a0,o0)}function o0(i,e,t,n){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Cl(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function c0(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===Yl?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===Vh?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===Cn&&(e="SHADOWMAP_TYPE_VSM"),e}function l0(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case tr:case nr:e="ENVMAP_TYPE_CUBE";break;case Vs:e="ENVMAP_TYPE_CUBE_UV";break}return e}function u0(i){let e="ENVMAP_MODE_REFLECTION";if(i.envMap)switch(i.envMapMode){case nr:e="ENVMAP_MODE_REFRACTION";break}return e}function h0(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case ql:e="ENVMAP_BLENDING_MULTIPLY";break;case od:e="ENVMAP_BLENDING_MIX";break;case cd:e="ENVMAP_BLENDING_ADD";break}return e}function d0(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function f0(i,e,t,n){const r=i.getContext(),s=t.defines;let a=t.vertexShader,o=t.fragmentShader;const c=c0(t),l=l0(t),u=u0(t),h=h0(t),d=d0(t),f=e0(t),g=t0(s),_=r.createProgram();let m,p,T=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Sr).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Sr).join(`
`),p.length>0&&(p+=`
`)):(m=[Cl(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Sr).join(`
`),p=[Cl(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+u:"",t.envMap?"#define "+h:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==jn?"#define TONE_MAPPING":"",t.toneMapping!==jn?Xe.tonemapping_pars_fragment:"",t.toneMapping!==jn?J_("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Xe.colorspace_pars_fragment,j_("linearToOutputTexel",t.outputColorSpace),Q_(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Sr).join(`
`)),a=ko(a),a=Al(a,t),a=wl(a,t),o=ko(o),o=Al(o,t),o=wl(o,t),a=Rl(a),o=Rl(o),t.isRawShaderMaterial!==!0&&(T=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===Ic?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Ic?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const y=T+m+a,v=T+p+o,L=El(r,r.VERTEX_SHADER,y),R=El(r,r.FRAGMENT_SHADER,v);r.attachShader(_,L),r.attachShader(_,R),t.index0AttributeName!==void 0?r.bindAttribLocation(_,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(_,0,"position"),r.linkProgram(_);function C(P){if(i.debug.checkShaderErrors){const z=r.getProgramInfoLog(_).trim(),U=r.getShaderInfoLog(L).trim(),B=r.getShaderInfoLog(R).trim();let X=!0,G=!0;if(r.getProgramParameter(_,r.LINK_STATUS)===!1)if(X=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,_,L,R);else{const K=bl(r,L,"vertex"),O=bl(r,R,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(_,r.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+z+`
`+K+`
`+O)}else z!==""?console.warn("THREE.WebGLProgram: Program Info Log:",z):(U===""||B==="")&&(G=!1);G&&(P.diagnostics={runnable:X,programLog:z,vertexShader:{log:U,prefix:m},fragmentShader:{log:B,prefix:p}})}r.deleteShader(L),r.deleteShader(R),I=new ws(r,_),E=n0(r,_)}let I;this.getUniforms=function(){return I===void 0&&C(this),I};let E;this.getAttributes=function(){return E===void 0&&C(this),E};let x=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return x===!1&&(x=r.getProgramParameter(_,q_)),x},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Z_++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=L,this.fragmentShader=R,this}let p0=0;class m0{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new g0(e),t.set(e,n)),n}}class g0{constructor(e){this.id=p0++,this.code=e,this.usedTimes=0}}function _0(i,e,t,n,r,s,a){const o=new hu,c=new m0,l=new Set,u=[],h=r.logarithmicDepthBuffer,d=r.vertexTextures;let f=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(E){return l.add(E),E===0?"uv":`uv${E}`}function m(E,x,P,z,U){const B=z.fog,X=U.geometry,G=E.isMeshStandardMaterial?z.environment:null,K=(E.isMeshStandardMaterial?t:e).get(E.envMap||G),O=K&&K.mapping===Vs?K.image.height:null,J=g[E.type];E.precision!==null&&(f=r.getMaxPrecision(E.precision),f!==E.precision&&console.warn("THREE.WebGLProgram.getParameters:",E.precision,"not supported, using",f,"instead."));const se=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,ve=se!==void 0?se.length:0;let Ue=0;X.morphAttributes.position!==void 0&&(Ue=1),X.morphAttributes.normal!==void 0&&(Ue=2),X.morphAttributes.color!==void 0&&(Ue=3);let Qe,Y,ae,Ae;if(J){const ut=gn[J];Qe=ut.vertexShader,Y=ut.fragmentShader}else Qe=E.vertexShader,Y=E.fragmentShader,c.update(E),ae=c.getVertexShaderID(E),Ae=c.getFragmentShaderID(E);const ce=i.getRenderTarget(),Le=i.state.buffers.depth.getReversed(),nt=U.isInstancedMesh===!0,Pe=U.isBatchedMesh===!0,ot=!!E.map,ee=!!E.matcap,Q=!!K,A=!!E.aoMap,Ce=!!E.lightMap,te=!!E.bumpMap,Me=!!E.normalMap,oe=!!E.displacementMap,Fe=!!E.emissiveMap,me=!!E.metalnessMap,b=!!E.roughnessMap,M=E.anisotropy>0,k=E.clearcoat>0,q=E.dispersion>0,j=E.iridescence>0,Z=E.sheen>0,Re=E.transmission>0,he=M&&!!E.anisotropyMap,xe=k&&!!E.clearcoatMap,je=k&&!!E.clearcoatNormalMap,ie=k&&!!E.clearcoatRoughnessMap,Ee=j&&!!E.iridescenceMap,Ne=j&&!!E.iridescenceThicknessMap,ke=Z&&!!E.sheenColorMap,Te=Z&&!!E.sheenRoughnessMap,et=!!E.specularMap,We=!!E.specularColorMap,gt=!!E.specularIntensityMap,D=Re&&!!E.transmissionMap,de=Re&&!!E.thicknessMap,W=!!E.gradientMap,$=!!E.alphaMap,_e=E.alphaTest>0,ge=!!E.alphaHash,Ve=!!E.extensions;let Et=jn;E.toneMapped&&(ce===null||ce.isXRRenderTarget===!0)&&(Et=i.toneMapping);const Ut={shaderID:J,shaderType:E.type,shaderName:E.name,vertexShader:Qe,fragmentShader:Y,defines:E.defines,customVertexShaderID:ae,customFragmentShaderID:Ae,isRawShaderMaterial:E.isRawShaderMaterial===!0,glslVersion:E.glslVersion,precision:f,batching:Pe,batchingColor:Pe&&U._colorsTexture!==null,instancing:nt,instancingColor:nt&&U.instanceColor!==null,instancingMorph:nt&&U.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:ce===null?i.outputColorSpace:ce.isXRRenderTarget===!0?ce.texture.colorSpace:sr,alphaToCoverage:!!E.alphaToCoverage,map:ot,matcap:ee,envMap:Q,envMapMode:Q&&K.mapping,envMapCubeUVHeight:O,aoMap:A,lightMap:Ce,bumpMap:te,normalMap:Me,displacementMap:d&&oe,emissiveMap:Fe,normalMapObjectSpace:Me&&E.normalMapType===Md,normalMapTangentSpace:Me&&E.normalMapType===xd,metalnessMap:me,roughnessMap:b,anisotropy:M,anisotropyMap:he,clearcoat:k,clearcoatMap:xe,clearcoatNormalMap:je,clearcoatRoughnessMap:ie,dispersion:q,iridescence:j,iridescenceMap:Ee,iridescenceThicknessMap:Ne,sheen:Z,sheenColorMap:ke,sheenRoughnessMap:Te,specularMap:et,specularColorMap:We,specularIntensityMap:gt,transmission:Re,transmissionMap:D,thicknessMap:de,gradientMap:W,opaque:E.transparent===!1&&E.blending===Xi&&E.alphaToCoverage===!1,alphaMap:$,alphaTest:_e,alphaHash:ge,combine:E.combine,mapUv:ot&&_(E.map.channel),aoMapUv:A&&_(E.aoMap.channel),lightMapUv:Ce&&_(E.lightMap.channel),bumpMapUv:te&&_(E.bumpMap.channel),normalMapUv:Me&&_(E.normalMap.channel),displacementMapUv:oe&&_(E.displacementMap.channel),emissiveMapUv:Fe&&_(E.emissiveMap.channel),metalnessMapUv:me&&_(E.metalnessMap.channel),roughnessMapUv:b&&_(E.roughnessMap.channel),anisotropyMapUv:he&&_(E.anisotropyMap.channel),clearcoatMapUv:xe&&_(E.clearcoatMap.channel),clearcoatNormalMapUv:je&&_(E.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ie&&_(E.clearcoatRoughnessMap.channel),iridescenceMapUv:Ee&&_(E.iridescenceMap.channel),iridescenceThicknessMapUv:Ne&&_(E.iridescenceThicknessMap.channel),sheenColorMapUv:ke&&_(E.sheenColorMap.channel),sheenRoughnessMapUv:Te&&_(E.sheenRoughnessMap.channel),specularMapUv:et&&_(E.specularMap.channel),specularColorMapUv:We&&_(E.specularColorMap.channel),specularIntensityMapUv:gt&&_(E.specularIntensityMap.channel),transmissionMapUv:D&&_(E.transmissionMap.channel),thicknessMapUv:de&&_(E.thicknessMap.channel),alphaMapUv:$&&_(E.alphaMap.channel),vertexTangents:!!X.attributes.tangent&&(Me||M),vertexColors:E.vertexColors,vertexAlphas:E.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,pointsUvs:U.isPoints===!0&&!!X.attributes.uv&&(ot||$),fog:!!B,useFog:E.fog===!0,fogExp2:!!B&&B.isFogExp2,flatShading:E.flatShading===!0,sizeAttenuation:E.sizeAttenuation===!0,logarithmicDepthBuffer:h,reverseDepthBuffer:Le,skinning:U.isSkinnedMesh===!0,morphTargets:X.morphAttributes.position!==void 0,morphNormals:X.morphAttributes.normal!==void 0,morphColors:X.morphAttributes.color!==void 0,morphTargetsCount:ve,morphTextureStride:Ue,numDirLights:x.directional.length,numPointLights:x.point.length,numSpotLights:x.spot.length,numSpotLightMaps:x.spotLightMap.length,numRectAreaLights:x.rectArea.length,numHemiLights:x.hemi.length,numDirLightShadows:x.directionalShadowMap.length,numPointLightShadows:x.pointShadowMap.length,numSpotLightShadows:x.spotShadowMap.length,numSpotLightShadowsWithMaps:x.numSpotLightShadowsWithMaps,numLightProbes:x.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:E.dithering,shadowMapEnabled:i.shadowMap.enabled&&P.length>0,shadowMapType:i.shadowMap.type,toneMapping:Et,decodeVideoTexture:ot&&E.map.isVideoTexture===!0&&st.getTransfer(E.map.colorSpace)===pt,decodeVideoTextureEmissive:Fe&&E.emissiveMap.isVideoTexture===!0&&st.getTransfer(E.emissiveMap.colorSpace)===pt,premultipliedAlpha:E.premultipliedAlpha,doubleSided:E.side===bt,flipSided:E.side===Zt,useDepthPacking:E.depthPacking>=0,depthPacking:E.depthPacking||0,index0AttributeName:E.index0AttributeName,extensionClipCullDistance:Ve&&E.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ve&&E.extensions.multiDraw===!0||Pe)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:E.customProgramCacheKey()};return Ut.vertexUv1s=l.has(1),Ut.vertexUv2s=l.has(2),Ut.vertexUv3s=l.has(3),l.clear(),Ut}function p(E){const x=[];if(E.shaderID?x.push(E.shaderID):(x.push(E.customVertexShaderID),x.push(E.customFragmentShaderID)),E.defines!==void 0)for(const P in E.defines)x.push(P),x.push(E.defines[P]);return E.isRawShaderMaterial===!1&&(T(x,E),y(x,E),x.push(i.outputColorSpace)),x.push(E.customProgramCacheKey),x.join()}function T(E,x){E.push(x.precision),E.push(x.outputColorSpace),E.push(x.envMapMode),E.push(x.envMapCubeUVHeight),E.push(x.mapUv),E.push(x.alphaMapUv),E.push(x.lightMapUv),E.push(x.aoMapUv),E.push(x.bumpMapUv),E.push(x.normalMapUv),E.push(x.displacementMapUv),E.push(x.emissiveMapUv),E.push(x.metalnessMapUv),E.push(x.roughnessMapUv),E.push(x.anisotropyMapUv),E.push(x.clearcoatMapUv),E.push(x.clearcoatNormalMapUv),E.push(x.clearcoatRoughnessMapUv),E.push(x.iridescenceMapUv),E.push(x.iridescenceThicknessMapUv),E.push(x.sheenColorMapUv),E.push(x.sheenRoughnessMapUv),E.push(x.specularMapUv),E.push(x.specularColorMapUv),E.push(x.specularIntensityMapUv),E.push(x.transmissionMapUv),E.push(x.thicknessMapUv),E.push(x.combine),E.push(x.fogExp2),E.push(x.sizeAttenuation),E.push(x.morphTargetsCount),E.push(x.morphAttributeCount),E.push(x.numDirLights),E.push(x.numPointLights),E.push(x.numSpotLights),E.push(x.numSpotLightMaps),E.push(x.numHemiLights),E.push(x.numRectAreaLights),E.push(x.numDirLightShadows),E.push(x.numPointLightShadows),E.push(x.numSpotLightShadows),E.push(x.numSpotLightShadowsWithMaps),E.push(x.numLightProbes),E.push(x.shadowMapType),E.push(x.toneMapping),E.push(x.numClippingPlanes),E.push(x.numClipIntersection),E.push(x.depthPacking)}function y(E,x){o.disableAll(),x.supportsVertexTextures&&o.enable(0),x.instancing&&o.enable(1),x.instancingColor&&o.enable(2),x.instancingMorph&&o.enable(3),x.matcap&&o.enable(4),x.envMap&&o.enable(5),x.normalMapObjectSpace&&o.enable(6),x.normalMapTangentSpace&&o.enable(7),x.clearcoat&&o.enable(8),x.iridescence&&o.enable(9),x.alphaTest&&o.enable(10),x.vertexColors&&o.enable(11),x.vertexAlphas&&o.enable(12),x.vertexUv1s&&o.enable(13),x.vertexUv2s&&o.enable(14),x.vertexUv3s&&o.enable(15),x.vertexTangents&&o.enable(16),x.anisotropy&&o.enable(17),x.alphaHash&&o.enable(18),x.batching&&o.enable(19),x.dispersion&&o.enable(20),x.batchingColor&&o.enable(21),E.push(o.mask),o.disableAll(),x.fog&&o.enable(0),x.useFog&&o.enable(1),x.flatShading&&o.enable(2),x.logarithmicDepthBuffer&&o.enable(3),x.reverseDepthBuffer&&o.enable(4),x.skinning&&o.enable(5),x.morphTargets&&o.enable(6),x.morphNormals&&o.enable(7),x.morphColors&&o.enable(8),x.premultipliedAlpha&&o.enable(9),x.shadowMapEnabled&&o.enable(10),x.doubleSided&&o.enable(11),x.flipSided&&o.enable(12),x.useDepthPacking&&o.enable(13),x.dithering&&o.enable(14),x.transmission&&o.enable(15),x.sheen&&o.enable(16),x.opaque&&o.enable(17),x.pointsUvs&&o.enable(18),x.decodeVideoTexture&&o.enable(19),x.decodeVideoTextureEmissive&&o.enable(20),x.alphaToCoverage&&o.enable(21),E.push(o.mask)}function v(E){const x=g[E.type];let P;if(x){const z=gn[x];P=ff.clone(z.uniforms)}else P=E.uniforms;return P}function L(E,x){let P;for(let z=0,U=u.length;z<U;z++){const B=u[z];if(B.cacheKey===x){P=B,++P.usedTimes;break}}return P===void 0&&(P=new f0(i,x,E,s),u.push(P)),P}function R(E){if(--E.usedTimes===0){const x=u.indexOf(E);u[x]=u[u.length-1],u.pop(),E.destroy()}}function C(E){c.remove(E)}function I(){c.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:v,acquireProgram:L,releaseProgram:R,releaseShaderCache:C,programs:u,dispose:I}}function v0(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function r(a,o,c){i.get(a)[o]=c}function s(){i=new WeakMap}return{has:e,get:t,remove:n,update:r,dispose:s}}function x0(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function Pl(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Ll(){const i=[];let e=0;const t=[],n=[],r=[];function s(){e=0,t.length=0,n.length=0,r.length=0}function a(h,d,f,g,_,m){let p=i[e];return p===void 0?(p={id:h.id,object:h,geometry:d,material:f,groupOrder:g,renderOrder:h.renderOrder,z:_,group:m},i[e]=p):(p.id=h.id,p.object=h,p.geometry=d,p.material=f,p.groupOrder=g,p.renderOrder=h.renderOrder,p.z=_,p.group=m),e++,p}function o(h,d,f,g,_,m){const p=a(h,d,f,g,_,m);f.transmission>0?n.push(p):f.transparent===!0?r.push(p):t.push(p)}function c(h,d,f,g,_,m){const p=a(h,d,f,g,_,m);f.transmission>0?n.unshift(p):f.transparent===!0?r.unshift(p):t.unshift(p)}function l(h,d){t.length>1&&t.sort(h||x0),n.length>1&&n.sort(d||Pl),r.length>1&&r.sort(d||Pl)}function u(){for(let h=e,d=i.length;h<d;h++){const f=i[h];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:r,init:s,push:o,unshift:c,finish:u,sort:l}}function M0(){let i=new WeakMap;function e(n,r){const s=i.get(n);let a;return s===void 0?(a=new Ll,i.set(n,[a])):r>=s.length?(a=new Ll,s.push(a)):a=s[r],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function y0(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new w,color:new tt};break;case"SpotLight":t={position:new w,direction:new w,color:new tt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new w,color:new tt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new w,skyColor:new tt,groundColor:new tt};break;case"RectAreaLight":t={color:new tt,position:new w,halfWidth:new w,halfHeight:new w};break}return i[e.id]=t,t}}}function S0(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new le};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new le};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new le,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let E0=0;function T0(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function b0(i){const e=new y0,t=S0(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new w);const r=new w,s=new St,a=new St;function o(l){let u=0,h=0,d=0;for(let E=0;E<9;E++)n.probe[E].set(0,0,0);let f=0,g=0,_=0,m=0,p=0,T=0,y=0,v=0,L=0,R=0,C=0;l.sort(T0);for(let E=0,x=l.length;E<x;E++){const P=l[E],z=P.color,U=P.intensity,B=P.distance,X=P.shadow&&P.shadow.map?P.shadow.map.texture:null;if(P.isAmbientLight)u+=z.r*U,h+=z.g*U,d+=z.b*U;else if(P.isLightProbe){for(let G=0;G<9;G++)n.probe[G].addScaledVector(P.sh.coefficients[G],U);C++}else if(P.isDirectionalLight){const G=e.get(P);if(G.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){const K=P.shadow,O=t.get(P);O.shadowIntensity=K.intensity,O.shadowBias=K.bias,O.shadowNormalBias=K.normalBias,O.shadowRadius=K.radius,O.shadowMapSize=K.mapSize,n.directionalShadow[f]=O,n.directionalShadowMap[f]=X,n.directionalShadowMatrix[f]=P.shadow.matrix,T++}n.directional[f]=G,f++}else if(P.isSpotLight){const G=e.get(P);G.position.setFromMatrixPosition(P.matrixWorld),G.color.copy(z).multiplyScalar(U),G.distance=B,G.coneCos=Math.cos(P.angle),G.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),G.decay=P.decay,n.spot[_]=G;const K=P.shadow;if(P.map&&(n.spotLightMap[L]=P.map,L++,K.updateMatrices(P),P.castShadow&&R++),n.spotLightMatrix[_]=K.matrix,P.castShadow){const O=t.get(P);O.shadowIntensity=K.intensity,O.shadowBias=K.bias,O.shadowNormalBias=K.normalBias,O.shadowRadius=K.radius,O.shadowMapSize=K.mapSize,n.spotShadow[_]=O,n.spotShadowMap[_]=X,v++}_++}else if(P.isRectAreaLight){const G=e.get(P);G.color.copy(z).multiplyScalar(U),G.halfWidth.set(P.width*.5,0,0),G.halfHeight.set(0,P.height*.5,0),n.rectArea[m]=G,m++}else if(P.isPointLight){const G=e.get(P);if(G.color.copy(P.color).multiplyScalar(P.intensity),G.distance=P.distance,G.decay=P.decay,P.castShadow){const K=P.shadow,O=t.get(P);O.shadowIntensity=K.intensity,O.shadowBias=K.bias,O.shadowNormalBias=K.normalBias,O.shadowRadius=K.radius,O.shadowMapSize=K.mapSize,O.shadowCameraNear=K.camera.near,O.shadowCameraFar=K.camera.far,n.pointShadow[g]=O,n.pointShadowMap[g]=X,n.pointShadowMatrix[g]=P.shadow.matrix,y++}n.point[g]=G,g++}else if(P.isHemisphereLight){const G=e.get(P);G.skyColor.copy(P.color).multiplyScalar(U),G.groundColor.copy(P.groundColor).multiplyScalar(U),n.hemi[p]=G,p++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ue.LTC_FLOAT_1,n.rectAreaLTC2=ue.LTC_FLOAT_2):(n.rectAreaLTC1=ue.LTC_HALF_1,n.rectAreaLTC2=ue.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=h,n.ambient[2]=d;const I=n.hash;(I.directionalLength!==f||I.pointLength!==g||I.spotLength!==_||I.rectAreaLength!==m||I.hemiLength!==p||I.numDirectionalShadows!==T||I.numPointShadows!==y||I.numSpotShadows!==v||I.numSpotMaps!==L||I.numLightProbes!==C)&&(n.directional.length=f,n.spot.length=_,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=T,n.directionalShadowMap.length=T,n.pointShadow.length=y,n.pointShadowMap.length=y,n.spotShadow.length=v,n.spotShadowMap.length=v,n.directionalShadowMatrix.length=T,n.pointShadowMatrix.length=y,n.spotLightMatrix.length=v+L-R,n.spotLightMap.length=L,n.numSpotLightShadowsWithMaps=R,n.numLightProbes=C,I.directionalLength=f,I.pointLength=g,I.spotLength=_,I.rectAreaLength=m,I.hemiLength=p,I.numDirectionalShadows=T,I.numPointShadows=y,I.numSpotShadows=v,I.numSpotMaps=L,I.numLightProbes=C,n.version=E0++)}function c(l,u){let h=0,d=0,f=0,g=0,_=0;const m=u.matrixWorldInverse;for(let p=0,T=l.length;p<T;p++){const y=l[p];if(y.isDirectionalLight){const v=n.directional[h];v.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(m),h++}else if(y.isSpotLight){const v=n.spot[f];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(m),v.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),v.direction.sub(r),v.direction.transformDirection(m),f++}else if(y.isRectAreaLight){const v=n.rectArea[g];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(m),a.identity(),s.copy(y.matrixWorld),s.premultiply(m),a.extractRotation(s),v.halfWidth.set(y.width*.5,0,0),v.halfHeight.set(0,y.height*.5,0),v.halfWidth.applyMatrix4(a),v.halfHeight.applyMatrix4(a),g++}else if(y.isPointLight){const v=n.point[d];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(m),d++}else if(y.isHemisphereLight){const v=n.hemi[_];v.direction.setFromMatrixPosition(y.matrixWorld),v.direction.transformDirection(m),_++}}}return{setup:o,setupView:c,state:n}}function Il(i){const e=new b0(i),t=[],n=[];function r(u){l.camera=u,t.length=0,n.length=0}function s(u){t.push(u)}function a(u){n.push(u)}function o(){e.setup(t)}function c(u){e.setupView(t,u)}const l={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:l,setupLights:o,setupLightsView:c,pushLight:s,pushShadow:a}}function A0(i){let e=new WeakMap;function t(r,s=0){const a=e.get(r);let o;return a===void 0?(o=new Il(i),e.set(r,[o])):s>=a.length?(o=new Il(i),a.push(o)):o=a[s],o}function n(){e=new WeakMap}return{get:t,dispose:n}}const w0=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,R0=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function C0(i,e,t){let n=new Mu;const r=new le,s=new le,a=new At,o=new ep({depthPacking:vd}),c=new tp,l={},u=t.maxTextureSize,h={[Qn]:Zt,[Zt]:Qn,[bt]:bt},d=new ei({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new le},radius:{value:4}},vertexShader:w0,fragmentShader:R0}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const g=new Ze;g.setAttribute("position",new Ht(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new mt(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Yl;let p=this.type;this.render=function(R,C,I){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||R.length===0)return;const E=i.getRenderTarget(),x=i.getActiveCubeFace(),P=i.getActiveMipmapLevel(),z=i.state;z.setBlending(Kn),z.buffers.color.setClear(1,1,1,1),z.buffers.depth.setTest(!0),z.setScissorTest(!1);const U=p!==Cn&&this.type===Cn,B=p===Cn&&this.type!==Cn;for(let X=0,G=R.length;X<G;X++){const K=R[X],O=K.shadow;if(O===void 0){console.warn("THREE.WebGLShadowMap:",K,"has no shadow.");continue}if(O.autoUpdate===!1&&O.needsUpdate===!1)continue;r.copy(O.mapSize);const J=O.getFrameExtents();if(r.multiply(J),s.copy(O.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/J.x),r.x=s.x*J.x,O.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/J.y),r.y=s.y*J.y,O.mapSize.y=s.y)),O.map===null||U===!0||B===!0){const ve=this.type!==Cn?{minFilter:pn,magFilter:pn}:{};O.map!==null&&O.map.dispose(),O.map=new _i(r.x,r.y,ve),O.map.texture.name=K.name+".shadowMap",O.camera.updateProjectionMatrix()}i.setRenderTarget(O.map),i.clear();const se=O.getViewportCount();for(let ve=0;ve<se;ve++){const Ue=O.getViewport(ve);a.set(s.x*Ue.x,s.y*Ue.y,s.x*Ue.z,s.y*Ue.w),z.viewport(a),O.updateMatrices(K,ve),n=O.getFrustum(),v(C,I,O.camera,K,this.type)}O.isPointLightShadow!==!0&&this.type===Cn&&T(O,I),O.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(E,x,P)};function T(R,C){const I=e.update(_);d.defines.VSM_SAMPLES!==R.blurSamples&&(d.defines.VSM_SAMPLES=R.blurSamples,f.defines.VSM_SAMPLES=R.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),R.mapPass===null&&(R.mapPass=new _i(r.x,r.y)),d.uniforms.shadow_pass.value=R.map.texture,d.uniforms.resolution.value=R.mapSize,d.uniforms.radius.value=R.radius,i.setRenderTarget(R.mapPass),i.clear(),i.renderBufferDirect(C,null,I,d,_,null),f.uniforms.shadow_pass.value=R.mapPass.texture,f.uniforms.resolution.value=R.mapSize,f.uniforms.radius.value=R.radius,i.setRenderTarget(R.map),i.clear(),i.renderBufferDirect(C,null,I,f,_,null)}function y(R,C,I,E){let x=null;const P=I.isPointLight===!0?R.customDistanceMaterial:R.customDepthMaterial;if(P!==void 0)x=P;else if(x=I.isPointLight===!0?c:o,i.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0){const z=x.uuid,U=C.uuid;let B=l[z];B===void 0&&(B={},l[z]=B);let X=B[U];X===void 0&&(X=x.clone(),B[U]=X,C.addEventListener("dispose",L)),x=X}if(x.visible=C.visible,x.wireframe=C.wireframe,E===Cn?x.side=C.shadowSide!==null?C.shadowSide:C.side:x.side=C.shadowSide!==null?C.shadowSide:h[C.side],x.alphaMap=C.alphaMap,x.alphaTest=C.alphaTest,x.map=C.map,x.clipShadows=C.clipShadows,x.clippingPlanes=C.clippingPlanes,x.clipIntersection=C.clipIntersection,x.displacementMap=C.displacementMap,x.displacementScale=C.displacementScale,x.displacementBias=C.displacementBias,x.wireframeLinewidth=C.wireframeLinewidth,x.linewidth=C.linewidth,I.isPointLight===!0&&x.isMeshDistanceMaterial===!0){const z=i.properties.get(x);z.light=I}return x}function v(R,C,I,E,x){if(R.visible===!1)return;if(R.layers.test(C.layers)&&(R.isMesh||R.isLine||R.isPoints)&&(R.castShadow||R.receiveShadow&&x===Cn)&&(!R.frustumCulled||n.intersectsObject(R))){R.modelViewMatrix.multiplyMatrices(I.matrixWorldInverse,R.matrixWorld);const U=e.update(R),B=R.material;if(Array.isArray(B)){const X=U.groups;for(let G=0,K=X.length;G<K;G++){const O=X[G],J=B[O.materialIndex];if(J&&J.visible){const se=y(R,J,E,x);R.onBeforeShadow(i,R,C,I,U,se,O),i.renderBufferDirect(I,null,U,se,R,O),R.onAfterShadow(i,R,C,I,U,se,O)}}}else if(B.visible){const X=y(R,B,E,x);R.onBeforeShadow(i,R,C,I,U,X,null),i.renderBufferDirect(I,null,U,X,R,null),R.onAfterShadow(i,R,C,I,U,X,null)}}const z=R.children;for(let U=0,B=z.length;U<B;U++)v(z[U],C,I,E,x)}function L(R){R.target.removeEventListener("dispose",L);for(const I in l){const E=l[I],x=R.target.uuid;x in E&&(E[x].dispose(),delete E[x])}}}const P0={[Ka]:ja,[Ja]:to,[Qa]:no,[er]:eo,[ja]:Ka,[to]:Ja,[no]:Qa,[eo]:er};function L0(i,e){function t(){let D=!1;const de=new At;let W=null;const $=new At(0,0,0,0);return{setMask:function(_e){W!==_e&&!D&&(i.colorMask(_e,_e,_e,_e),W=_e)},setLocked:function(_e){D=_e},setClear:function(_e,ge,Ve,Et,Ut){Ut===!0&&(_e*=Et,ge*=Et,Ve*=Et),de.set(_e,ge,Ve,Et),$.equals(de)===!1&&(i.clearColor(_e,ge,Ve,Et),$.copy(de))},reset:function(){D=!1,W=null,$.set(-1,0,0,0)}}}function n(){let D=!1,de=!1,W=null,$=null,_e=null;return{setReversed:function(ge){if(de!==ge){const Ve=e.get("EXT_clip_control");de?Ve.clipControlEXT(Ve.LOWER_LEFT_EXT,Ve.ZERO_TO_ONE_EXT):Ve.clipControlEXT(Ve.LOWER_LEFT_EXT,Ve.NEGATIVE_ONE_TO_ONE_EXT);const Et=_e;_e=null,this.setClear(Et)}de=ge},getReversed:function(){return de},setTest:function(ge){ge?ce(i.DEPTH_TEST):Le(i.DEPTH_TEST)},setMask:function(ge){W!==ge&&!D&&(i.depthMask(ge),W=ge)},setFunc:function(ge){if(de&&(ge=P0[ge]),$!==ge){switch(ge){case Ka:i.depthFunc(i.NEVER);break;case ja:i.depthFunc(i.ALWAYS);break;case Ja:i.depthFunc(i.LESS);break;case er:i.depthFunc(i.LEQUAL);break;case Qa:i.depthFunc(i.EQUAL);break;case eo:i.depthFunc(i.GEQUAL);break;case to:i.depthFunc(i.GREATER);break;case no:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}$=ge}},setLocked:function(ge){D=ge},setClear:function(ge){_e!==ge&&(de&&(ge=1-ge),i.clearDepth(ge),_e=ge)},reset:function(){D=!1,W=null,$=null,_e=null,de=!1}}}function r(){let D=!1,de=null,W=null,$=null,_e=null,ge=null,Ve=null,Et=null,Ut=null;return{setTest:function(ut){D||(ut?ce(i.STENCIL_TEST):Le(i.STENCIL_TEST))},setMask:function(ut){de!==ut&&!D&&(i.stencilMask(ut),de=ut)},setFunc:function(ut,on,En){(W!==ut||$!==on||_e!==En)&&(i.stencilFunc(ut,on,En),W=ut,$=on,_e=En)},setOp:function(ut,on,En){(ge!==ut||Ve!==on||Et!==En)&&(i.stencilOp(ut,on,En),ge=ut,Ve=on,Et=En)},setLocked:function(ut){D=ut},setClear:function(ut){Ut!==ut&&(i.clearStencil(ut),Ut=ut)},reset:function(){D=!1,de=null,W=null,$=null,_e=null,ge=null,Ve=null,Et=null,Ut=null}}}const s=new t,a=new n,o=new r,c=new WeakMap,l=new WeakMap;let u={},h={},d=new WeakMap,f=[],g=null,_=!1,m=null,p=null,T=null,y=null,v=null,L=null,R=null,C=new tt(0,0,0),I=0,E=!1,x=null,P=null,z=null,U=null,B=null;const X=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let G=!1,K=0;const O=i.getParameter(i.VERSION);O.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(O)[1]),G=K>=1):O.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(O)[1]),G=K>=2);let J=null,se={};const ve=i.getParameter(i.SCISSOR_BOX),Ue=i.getParameter(i.VIEWPORT),Qe=new At().fromArray(ve),Y=new At().fromArray(Ue);function ae(D,de,W,$){const _e=new Uint8Array(4),ge=i.createTexture();i.bindTexture(D,ge),i.texParameteri(D,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(D,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ve=0;Ve<W;Ve++)D===i.TEXTURE_3D||D===i.TEXTURE_2D_ARRAY?i.texImage3D(de,0,i.RGBA,1,1,$,0,i.RGBA,i.UNSIGNED_BYTE,_e):i.texImage2D(de+Ve,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,_e);return ge}const Ae={};Ae[i.TEXTURE_2D]=ae(i.TEXTURE_2D,i.TEXTURE_2D,1),Ae[i.TEXTURE_CUBE_MAP]=ae(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Ae[i.TEXTURE_2D_ARRAY]=ae(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Ae[i.TEXTURE_3D]=ae(i.TEXTURE_3D,i.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),ce(i.DEPTH_TEST),a.setFunc(er),te(!1),Me(wc),ce(i.CULL_FACE),A(Kn);function ce(D){u[D]!==!0&&(i.enable(D),u[D]=!0)}function Le(D){u[D]!==!1&&(i.disable(D),u[D]=!1)}function nt(D,de){return h[D]!==de?(i.bindFramebuffer(D,de),h[D]=de,D===i.DRAW_FRAMEBUFFER&&(h[i.FRAMEBUFFER]=de),D===i.FRAMEBUFFER&&(h[i.DRAW_FRAMEBUFFER]=de),!0):!1}function Pe(D,de){let W=f,$=!1;if(D){W=d.get(de),W===void 0&&(W=[],d.set(de,W));const _e=D.textures;if(W.length!==_e.length||W[0]!==i.COLOR_ATTACHMENT0){for(let ge=0,Ve=_e.length;ge<Ve;ge++)W[ge]=i.COLOR_ATTACHMENT0+ge;W.length=_e.length,$=!0}}else W[0]!==i.BACK&&(W[0]=i.BACK,$=!0);$&&i.drawBuffers(W)}function ot(D){return g!==D?(i.useProgram(D),g=D,!0):!1}const ee={[hi]:i.FUNC_ADD,[Wh]:i.FUNC_SUBTRACT,[Xh]:i.FUNC_REVERSE_SUBTRACT};ee[Yh]=i.MIN,ee[qh]=i.MAX;const Q={[Zh]:i.ZERO,[$h]:i.ONE,[Kh]:i.SRC_COLOR,[Za]:i.SRC_ALPHA,[nd]:i.SRC_ALPHA_SATURATE,[ed]:i.DST_COLOR,[Jh]:i.DST_ALPHA,[jh]:i.ONE_MINUS_SRC_COLOR,[$a]:i.ONE_MINUS_SRC_ALPHA,[td]:i.ONE_MINUS_DST_COLOR,[Qh]:i.ONE_MINUS_DST_ALPHA,[id]:i.CONSTANT_COLOR,[rd]:i.ONE_MINUS_CONSTANT_COLOR,[sd]:i.CONSTANT_ALPHA,[ad]:i.ONE_MINUS_CONSTANT_ALPHA};function A(D,de,W,$,_e,ge,Ve,Et,Ut,ut){if(D===Kn){_===!0&&(Le(i.BLEND),_=!1);return}if(_===!1&&(ce(i.BLEND),_=!0),D!==Hh){if(D!==m||ut!==E){if((p!==hi||v!==hi)&&(i.blendEquation(i.FUNC_ADD),p=hi,v=hi),ut)switch(D){case Xi:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Rc:i.blendFunc(i.ONE,i.ONE);break;case Cc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Pc:i.blendFuncSeparate(i.ZERO,i.SRC_COLOR,i.ZERO,i.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",D);break}else switch(D){case Xi:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Rc:i.blendFunc(i.SRC_ALPHA,i.ONE);break;case Cc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Pc:i.blendFunc(i.ZERO,i.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",D);break}T=null,y=null,L=null,R=null,C.set(0,0,0),I=0,m=D,E=ut}return}_e=_e||de,ge=ge||W,Ve=Ve||$,(de!==p||_e!==v)&&(i.blendEquationSeparate(ee[de],ee[_e]),p=de,v=_e),(W!==T||$!==y||ge!==L||Ve!==R)&&(i.blendFuncSeparate(Q[W],Q[$],Q[ge],Q[Ve]),T=W,y=$,L=ge,R=Ve),(Et.equals(C)===!1||Ut!==I)&&(i.blendColor(Et.r,Et.g,Et.b,Ut),C.copy(Et),I=Ut),m=D,E=!1}function Ce(D,de){D.side===bt?Le(i.CULL_FACE):ce(i.CULL_FACE);let W=D.side===Zt;de&&(W=!W),te(W),D.blending===Xi&&D.transparent===!1?A(Kn):A(D.blending,D.blendEquation,D.blendSrc,D.blendDst,D.blendEquationAlpha,D.blendSrcAlpha,D.blendDstAlpha,D.blendColor,D.blendAlpha,D.premultipliedAlpha),a.setFunc(D.depthFunc),a.setTest(D.depthTest),a.setMask(D.depthWrite),s.setMask(D.colorWrite);const $=D.stencilWrite;o.setTest($),$&&(o.setMask(D.stencilWriteMask),o.setFunc(D.stencilFunc,D.stencilRef,D.stencilFuncMask),o.setOp(D.stencilFail,D.stencilZFail,D.stencilZPass)),Fe(D.polygonOffset,D.polygonOffsetFactor,D.polygonOffsetUnits),D.alphaToCoverage===!0?ce(i.SAMPLE_ALPHA_TO_COVERAGE):Le(i.SAMPLE_ALPHA_TO_COVERAGE)}function te(D){x!==D&&(D?i.frontFace(i.CW):i.frontFace(i.CCW),x=D)}function Me(D){D!==zh?(ce(i.CULL_FACE),D!==P&&(D===wc?i.cullFace(i.BACK):D===Gh?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Le(i.CULL_FACE),P=D}function oe(D){D!==z&&(G&&i.lineWidth(D),z=D)}function Fe(D,de,W){D?(ce(i.POLYGON_OFFSET_FILL),(U!==de||B!==W)&&(i.polygonOffset(de,W),U=de,B=W)):Le(i.POLYGON_OFFSET_FILL)}function me(D){D?ce(i.SCISSOR_TEST):Le(i.SCISSOR_TEST)}function b(D){D===void 0&&(D=i.TEXTURE0+X-1),J!==D&&(i.activeTexture(D),J=D)}function M(D,de,W){W===void 0&&(J===null?W=i.TEXTURE0+X-1:W=J);let $=se[W];$===void 0&&($={type:void 0,texture:void 0},se[W]=$),($.type!==D||$.texture!==de)&&(J!==W&&(i.activeTexture(W),J=W),i.bindTexture(D,de||Ae[D]),$.type=D,$.texture=de)}function k(){const D=se[J];D!==void 0&&D.type!==void 0&&(i.bindTexture(D.type,null),D.type=void 0,D.texture=void 0)}function q(){try{i.compressedTexImage2D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function j(){try{i.compressedTexImage3D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function Z(){try{i.texSubImage2D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function Re(){try{i.texSubImage3D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function he(){try{i.compressedTexSubImage2D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function xe(){try{i.compressedTexSubImage3D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function je(){try{i.texStorage2D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function ie(){try{i.texStorage3D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function Ee(){try{i.texImage2D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function Ne(){try{i.texImage3D.apply(i,arguments)}catch(D){console.error("THREE.WebGLState:",D)}}function ke(D){Qe.equals(D)===!1&&(i.scissor(D.x,D.y,D.z,D.w),Qe.copy(D))}function Te(D){Y.equals(D)===!1&&(i.viewport(D.x,D.y,D.z,D.w),Y.copy(D))}function et(D,de){let W=l.get(de);W===void 0&&(W=new WeakMap,l.set(de,W));let $=W.get(D);$===void 0&&($=i.getUniformBlockIndex(de,D.name),W.set(D,$))}function We(D,de){const $=l.get(de).get(D);c.get(de)!==$&&(i.uniformBlockBinding(de,$,D.__bindingPointIndex),c.set(de,$))}function gt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),u={},J=null,se={},h={},d=new WeakMap,f=[],g=null,_=!1,m=null,p=null,T=null,y=null,v=null,L=null,R=null,C=new tt(0,0,0),I=0,E=!1,x=null,P=null,z=null,U=null,B=null,Qe.set(0,0,i.canvas.width,i.canvas.height),Y.set(0,0,i.canvas.width,i.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:ce,disable:Le,bindFramebuffer:nt,drawBuffers:Pe,useProgram:ot,setBlending:A,setMaterial:Ce,setFlipSided:te,setCullFace:Me,setLineWidth:oe,setPolygonOffset:Fe,setScissorTest:me,activeTexture:b,bindTexture:M,unbindTexture:k,compressedTexImage2D:q,compressedTexImage3D:j,texImage2D:Ee,texImage3D:Ne,updateUBOMapping:et,uniformBlockBinding:We,texStorage2D:je,texStorage3D:ie,texSubImage2D:Z,texSubImage3D:Re,compressedTexSubImage2D:he,compressedTexSubImage3D:xe,scissor:ke,viewport:Te,reset:gt}}function I0(i,e,t,n,r,s,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new le,u=new WeakMap;let h;const d=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(b,M){return f?new OffscreenCanvas(b,M):Fs("canvas")}function _(b,M,k){let q=1;const j=me(b);if((j.width>k||j.height>k)&&(q=k/Math.max(j.width,j.height)),q<1)if(typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&b instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&b instanceof ImageBitmap||typeof VideoFrame<"u"&&b instanceof VideoFrame){const Z=Math.floor(q*j.width),Re=Math.floor(q*j.height);h===void 0&&(h=g(Z,Re));const he=M?g(Z,Re):h;return he.width=Z,he.height=Re,he.getContext("2d").drawImage(b,0,0,Z,Re),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+j.width+"x"+j.height+") to ("+Z+"x"+Re+")."),he}else return"data"in b&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+j.width+"x"+j.height+")."),b;return b}function m(b){return b.generateMipmaps}function p(b){i.generateMipmap(b)}function T(b){return b.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:b.isWebGL3DRenderTarget?i.TEXTURE_3D:b.isWebGLArrayRenderTarget||b.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function y(b,M,k,q,j=!1){if(b!==null){if(i[b]!==void 0)return i[b];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+b+"'")}let Z=M;if(M===i.RED&&(k===i.FLOAT&&(Z=i.R32F),k===i.HALF_FLOAT&&(Z=i.R16F),k===i.UNSIGNED_BYTE&&(Z=i.R8)),M===i.RED_INTEGER&&(k===i.UNSIGNED_BYTE&&(Z=i.R8UI),k===i.UNSIGNED_SHORT&&(Z=i.R16UI),k===i.UNSIGNED_INT&&(Z=i.R32UI),k===i.BYTE&&(Z=i.R8I),k===i.SHORT&&(Z=i.R16I),k===i.INT&&(Z=i.R32I)),M===i.RG&&(k===i.FLOAT&&(Z=i.RG32F),k===i.HALF_FLOAT&&(Z=i.RG16F),k===i.UNSIGNED_BYTE&&(Z=i.RG8)),M===i.RG_INTEGER&&(k===i.UNSIGNED_BYTE&&(Z=i.RG8UI),k===i.UNSIGNED_SHORT&&(Z=i.RG16UI),k===i.UNSIGNED_INT&&(Z=i.RG32UI),k===i.BYTE&&(Z=i.RG8I),k===i.SHORT&&(Z=i.RG16I),k===i.INT&&(Z=i.RG32I)),M===i.RGB_INTEGER&&(k===i.UNSIGNED_BYTE&&(Z=i.RGB8UI),k===i.UNSIGNED_SHORT&&(Z=i.RGB16UI),k===i.UNSIGNED_INT&&(Z=i.RGB32UI),k===i.BYTE&&(Z=i.RGB8I),k===i.SHORT&&(Z=i.RGB16I),k===i.INT&&(Z=i.RGB32I)),M===i.RGBA_INTEGER&&(k===i.UNSIGNED_BYTE&&(Z=i.RGBA8UI),k===i.UNSIGNED_SHORT&&(Z=i.RGBA16UI),k===i.UNSIGNED_INT&&(Z=i.RGBA32UI),k===i.BYTE&&(Z=i.RGBA8I),k===i.SHORT&&(Z=i.RGBA16I),k===i.INT&&(Z=i.RGBA32I)),M===i.RGB&&k===i.UNSIGNED_INT_5_9_9_9_REV&&(Z=i.RGB9_E5),M===i.RGBA){const Re=j?Ns:st.getTransfer(q);k===i.FLOAT&&(Z=i.RGBA32F),k===i.HALF_FLOAT&&(Z=i.RGBA16F),k===i.UNSIGNED_BYTE&&(Z=Re===pt?i.SRGB8_ALPHA8:i.RGBA8),k===i.UNSIGNED_SHORT_4_4_4_4&&(Z=i.RGBA4),k===i.UNSIGNED_SHORT_5_5_5_1&&(Z=i.RGB5_A1)}return(Z===i.R16F||Z===i.R32F||Z===i.RG16F||Z===i.RG32F||Z===i.RGBA16F||Z===i.RGBA32F)&&e.get("EXT_color_buffer_float"),Z}function v(b,M){let k;return b?M===null||M===gi||M===ir?k=i.DEPTH24_STENCIL8:M===Ln?k=i.DEPTH32F_STENCIL8:M===Lr&&(k=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===gi||M===ir?k=i.DEPTH_COMPONENT24:M===Ln?k=i.DEPTH_COMPONENT32F:M===Lr&&(k=i.DEPTH_COMPONENT16),k}function L(b,M){return m(b)===!0||b.isFramebufferTexture&&b.minFilter!==pn&&b.minFilter!==qt?Math.log2(Math.max(M.width,M.height))+1:b.mipmaps!==void 0&&b.mipmaps.length>0?b.mipmaps.length:b.isCompressedTexture&&Array.isArray(b.image)?M.mipmaps.length:1}function R(b){const M=b.target;M.removeEventListener("dispose",R),I(M),M.isVideoTexture&&u.delete(M)}function C(b){const M=b.target;M.removeEventListener("dispose",C),x(M)}function I(b){const M=n.get(b);if(M.__webglInit===void 0)return;const k=b.source,q=d.get(k);if(q){const j=q[M.__cacheKey];j.usedTimes--,j.usedTimes===0&&E(b),Object.keys(q).length===0&&d.delete(k)}n.remove(b)}function E(b){const M=n.get(b);i.deleteTexture(M.__webglTexture);const k=b.source,q=d.get(k);delete q[M.__cacheKey],a.memory.textures--}function x(b){const M=n.get(b);if(b.depthTexture&&(b.depthTexture.dispose(),n.remove(b.depthTexture)),b.isWebGLCubeRenderTarget)for(let q=0;q<6;q++){if(Array.isArray(M.__webglFramebuffer[q]))for(let j=0;j<M.__webglFramebuffer[q].length;j++)i.deleteFramebuffer(M.__webglFramebuffer[q][j]);else i.deleteFramebuffer(M.__webglFramebuffer[q]);M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer[q])}else{if(Array.isArray(M.__webglFramebuffer))for(let q=0;q<M.__webglFramebuffer.length;q++)i.deleteFramebuffer(M.__webglFramebuffer[q]);else i.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&i.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let q=0;q<M.__webglColorRenderbuffer.length;q++)M.__webglColorRenderbuffer[q]&&i.deleteRenderbuffer(M.__webglColorRenderbuffer[q]);M.__webglDepthRenderbuffer&&i.deleteRenderbuffer(M.__webglDepthRenderbuffer)}const k=b.textures;for(let q=0,j=k.length;q<j;q++){const Z=n.get(k[q]);Z.__webglTexture&&(i.deleteTexture(Z.__webglTexture),a.memory.textures--),n.remove(k[q])}n.remove(b)}let P=0;function z(){P=0}function U(){const b=P;return b>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+b+" texture units while this GPU supports only "+r.maxTextures),P+=1,b}function B(b){const M=[];return M.push(b.wrapS),M.push(b.wrapT),M.push(b.wrapR||0),M.push(b.magFilter),M.push(b.minFilter),M.push(b.anisotropy),M.push(b.internalFormat),M.push(b.format),M.push(b.type),M.push(b.generateMipmaps),M.push(b.premultiplyAlpha),M.push(b.flipY),M.push(b.unpackAlignment),M.push(b.colorSpace),M.join()}function X(b,M){const k=n.get(b);if(b.isVideoTexture&&oe(b),b.isRenderTargetTexture===!1&&b.version>0&&k.__version!==b.version){const q=b.image;if(q===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(q.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{Y(k,b,M);return}}t.bindTexture(i.TEXTURE_2D,k.__webglTexture,i.TEXTURE0+M)}function G(b,M){const k=n.get(b);if(b.version>0&&k.__version!==b.version){Y(k,b,M);return}t.bindTexture(i.TEXTURE_2D_ARRAY,k.__webglTexture,i.TEXTURE0+M)}function K(b,M){const k=n.get(b);if(b.version>0&&k.__version!==b.version){Y(k,b,M);return}t.bindTexture(i.TEXTURE_3D,k.__webglTexture,i.TEXTURE0+M)}function O(b,M){const k=n.get(b);if(b.version>0&&k.__version!==b.version){ae(k,b,M);return}t.bindTexture(i.TEXTURE_CUBE_MAP,k.__webglTexture,i.TEXTURE0+M)}const J={[so]:i.REPEAT,[fi]:i.CLAMP_TO_EDGE,[ao]:i.MIRRORED_REPEAT},se={[pn]:i.NEAREST,[gd]:i.NEAREST_MIPMAP_NEAREST,[Hr]:i.NEAREST_MIPMAP_LINEAR,[qt]:i.LINEAR,[Js]:i.LINEAR_MIPMAP_NEAREST,[pi]:i.LINEAR_MIPMAP_LINEAR},ve={[yd]:i.NEVER,[wd]:i.ALWAYS,[Sd]:i.LESS,[su]:i.LEQUAL,[Ed]:i.EQUAL,[Ad]:i.GEQUAL,[Td]:i.GREATER,[bd]:i.NOTEQUAL};function Ue(b,M){if(M.type===Ln&&e.has("OES_texture_float_linear")===!1&&(M.magFilter===qt||M.magFilter===Js||M.magFilter===Hr||M.magFilter===pi||M.minFilter===qt||M.minFilter===Js||M.minFilter===Hr||M.minFilter===pi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(b,i.TEXTURE_WRAP_S,J[M.wrapS]),i.texParameteri(b,i.TEXTURE_WRAP_T,J[M.wrapT]),(b===i.TEXTURE_3D||b===i.TEXTURE_2D_ARRAY)&&i.texParameteri(b,i.TEXTURE_WRAP_R,J[M.wrapR]),i.texParameteri(b,i.TEXTURE_MAG_FILTER,se[M.magFilter]),i.texParameteri(b,i.TEXTURE_MIN_FILTER,se[M.minFilter]),M.compareFunction&&(i.texParameteri(b,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(b,i.TEXTURE_COMPARE_FUNC,ve[M.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===pn||M.minFilter!==Hr&&M.minFilter!==pi||M.type===Ln&&e.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||n.get(M).__currentAnisotropy){const k=e.get("EXT_texture_filter_anisotropic");i.texParameterf(b,k.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,r.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy}}}function Qe(b,M){let k=!1;b.__webglInit===void 0&&(b.__webglInit=!0,M.addEventListener("dispose",R));const q=M.source;let j=d.get(q);j===void 0&&(j={},d.set(q,j));const Z=B(M);if(Z!==b.__cacheKey){j[Z]===void 0&&(j[Z]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,k=!0),j[Z].usedTimes++;const Re=j[b.__cacheKey];Re!==void 0&&(j[b.__cacheKey].usedTimes--,Re.usedTimes===0&&E(M)),b.__cacheKey=Z,b.__webglTexture=j[Z].texture}return k}function Y(b,M,k){let q=i.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(q=i.TEXTURE_2D_ARRAY),M.isData3DTexture&&(q=i.TEXTURE_3D);const j=Qe(b,M),Z=M.source;t.bindTexture(q,b.__webglTexture,i.TEXTURE0+k);const Re=n.get(Z);if(Z.version!==Re.__version||j===!0){t.activeTexture(i.TEXTURE0+k);const he=st.getPrimaries(st.workingColorSpace),xe=M.colorSpace===qn?null:st.getPrimaries(M.colorSpace),je=M.colorSpace===qn||he===xe?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,je);let ie=_(M.image,!1,r.maxTextureSize);ie=Fe(M,ie);const Ee=s.convert(M.format,M.colorSpace),Ne=s.convert(M.type);let ke=y(M.internalFormat,Ee,Ne,M.colorSpace,M.isVideoTexture);Ue(q,M);let Te;const et=M.mipmaps,We=M.isVideoTexture!==!0,gt=Re.__version===void 0||j===!0,D=Z.dataReady,de=L(M,ie);if(M.isDepthTexture)ke=v(M.format===rr,M.type),gt&&(We?t.texStorage2D(i.TEXTURE_2D,1,ke,ie.width,ie.height):t.texImage2D(i.TEXTURE_2D,0,ke,ie.width,ie.height,0,Ee,Ne,null));else if(M.isDataTexture)if(et.length>0){We&&gt&&t.texStorage2D(i.TEXTURE_2D,de,ke,et[0].width,et[0].height);for(let W=0,$=et.length;W<$;W++)Te=et[W],We?D&&t.texSubImage2D(i.TEXTURE_2D,W,0,0,Te.width,Te.height,Ee,Ne,Te.data):t.texImage2D(i.TEXTURE_2D,W,ke,Te.width,Te.height,0,Ee,Ne,Te.data);M.generateMipmaps=!1}else We?(gt&&t.texStorage2D(i.TEXTURE_2D,de,ke,ie.width,ie.height),D&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ie.width,ie.height,Ee,Ne,ie.data)):t.texImage2D(i.TEXTURE_2D,0,ke,ie.width,ie.height,0,Ee,Ne,ie.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){We&&gt&&t.texStorage3D(i.TEXTURE_2D_ARRAY,de,ke,et[0].width,et[0].height,ie.depth);for(let W=0,$=et.length;W<$;W++)if(Te=et[W],M.format!==fn)if(Ee!==null)if(We){if(D)if(M.layerUpdates.size>0){const _e=cl(Te.width,Te.height,M.format,M.type);for(const ge of M.layerUpdates){const Ve=Te.data.subarray(ge*_e/Te.data.BYTES_PER_ELEMENT,(ge+1)*_e/Te.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,W,0,0,ge,Te.width,Te.height,1,Ee,Ve)}M.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,W,0,0,0,Te.width,Te.height,ie.depth,Ee,Te.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,W,ke,Te.width,Te.height,ie.depth,0,Te.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else We?D&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,W,0,0,0,Te.width,Te.height,ie.depth,Ee,Ne,Te.data):t.texImage3D(i.TEXTURE_2D_ARRAY,W,ke,Te.width,Te.height,ie.depth,0,Ee,Ne,Te.data)}else{We&&gt&&t.texStorage2D(i.TEXTURE_2D,de,ke,et[0].width,et[0].height);for(let W=0,$=et.length;W<$;W++)Te=et[W],M.format!==fn?Ee!==null?We?D&&t.compressedTexSubImage2D(i.TEXTURE_2D,W,0,0,Te.width,Te.height,Ee,Te.data):t.compressedTexImage2D(i.TEXTURE_2D,W,ke,Te.width,Te.height,0,Te.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):We?D&&t.texSubImage2D(i.TEXTURE_2D,W,0,0,Te.width,Te.height,Ee,Ne,Te.data):t.texImage2D(i.TEXTURE_2D,W,ke,Te.width,Te.height,0,Ee,Ne,Te.data)}else if(M.isDataArrayTexture)if(We){if(gt&&t.texStorage3D(i.TEXTURE_2D_ARRAY,de,ke,ie.width,ie.height,ie.depth),D)if(M.layerUpdates.size>0){const W=cl(ie.width,ie.height,M.format,M.type);for(const $ of M.layerUpdates){const _e=ie.data.subarray($*W/ie.data.BYTES_PER_ELEMENT,($+1)*W/ie.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,$,ie.width,ie.height,1,Ee,Ne,_e)}M.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ie.width,ie.height,ie.depth,Ee,Ne,ie.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,ke,ie.width,ie.height,ie.depth,0,Ee,Ne,ie.data);else if(M.isData3DTexture)We?(gt&&t.texStorage3D(i.TEXTURE_3D,de,ke,ie.width,ie.height,ie.depth),D&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ie.width,ie.height,ie.depth,Ee,Ne,ie.data)):t.texImage3D(i.TEXTURE_3D,0,ke,ie.width,ie.height,ie.depth,0,Ee,Ne,ie.data);else if(M.isFramebufferTexture){if(gt)if(We)t.texStorage2D(i.TEXTURE_2D,de,ke,ie.width,ie.height);else{let W=ie.width,$=ie.height;for(let _e=0;_e<de;_e++)t.texImage2D(i.TEXTURE_2D,_e,ke,W,$,0,Ee,Ne,null),W>>=1,$>>=1}}else if(et.length>0){if(We&&gt){const W=me(et[0]);t.texStorage2D(i.TEXTURE_2D,de,ke,W.width,W.height)}for(let W=0,$=et.length;W<$;W++)Te=et[W],We?D&&t.texSubImage2D(i.TEXTURE_2D,W,0,0,Ee,Ne,Te):t.texImage2D(i.TEXTURE_2D,W,ke,Ee,Ne,Te);M.generateMipmaps=!1}else if(We){if(gt){const W=me(ie);t.texStorage2D(i.TEXTURE_2D,de,ke,W.width,W.height)}D&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,Ee,Ne,ie)}else t.texImage2D(i.TEXTURE_2D,0,ke,Ee,Ne,ie);m(M)&&p(q),Re.__version=Z.version,M.onUpdate&&M.onUpdate(M)}b.__version=M.version}function ae(b,M,k){if(M.image.length!==6)return;const q=Qe(b,M),j=M.source;t.bindTexture(i.TEXTURE_CUBE_MAP,b.__webglTexture,i.TEXTURE0+k);const Z=n.get(j);if(j.version!==Z.__version||q===!0){t.activeTexture(i.TEXTURE0+k);const Re=st.getPrimaries(st.workingColorSpace),he=M.colorSpace===qn?null:st.getPrimaries(M.colorSpace),xe=M.colorSpace===qn||Re===he?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,xe);const je=M.isCompressedTexture||M.image[0].isCompressedTexture,ie=M.image[0]&&M.image[0].isDataTexture,Ee=[];for(let $=0;$<6;$++)!je&&!ie?Ee[$]=_(M.image[$],!0,r.maxCubemapSize):Ee[$]=ie?M.image[$].image:M.image[$],Ee[$]=Fe(M,Ee[$]);const Ne=Ee[0],ke=s.convert(M.format,M.colorSpace),Te=s.convert(M.type),et=y(M.internalFormat,ke,Te,M.colorSpace),We=M.isVideoTexture!==!0,gt=Z.__version===void 0||q===!0,D=j.dataReady;let de=L(M,Ne);Ue(i.TEXTURE_CUBE_MAP,M);let W;if(je){We&&gt&&t.texStorage2D(i.TEXTURE_CUBE_MAP,de,et,Ne.width,Ne.height);for(let $=0;$<6;$++){W=Ee[$].mipmaps;for(let _e=0;_e<W.length;_e++){const ge=W[_e];M.format!==fn?ke!==null?We?D&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+$,_e,0,0,ge.width,ge.height,ke,ge.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+$,_e,et,ge.width,ge.height,0,ge.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):We?D&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+$,_e,0,0,ge.width,ge.height,ke,Te,ge.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+$,_e,et,ge.width,ge.height,0,ke,Te,ge.data)}}}else{if(W=M.mipmaps,We&&gt){W.length>0&&de++;const $=me(Ee[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,de,et,$.width,$.height)}for(let $=0;$<6;$++)if(ie){We?D&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+$,0,0,0,Ee[$].width,Ee[$].height,ke,Te,Ee[$].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+$,0,et,Ee[$].width,Ee[$].height,0,ke,Te,Ee[$].data);for(let _e=0;_e<W.length;_e++){const Ve=W[_e].image[$].image;We?D&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+$,_e+1,0,0,Ve.width,Ve.height,ke,Te,Ve.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+$,_e+1,et,Ve.width,Ve.height,0,ke,Te,Ve.data)}}else{We?D&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+$,0,0,0,ke,Te,Ee[$]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+$,0,et,ke,Te,Ee[$]);for(let _e=0;_e<W.length;_e++){const ge=W[_e];We?D&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+$,_e+1,0,0,ke,Te,ge.image[$]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+$,_e+1,et,ke,Te,ge.image[$])}}}m(M)&&p(i.TEXTURE_CUBE_MAP),Z.__version=j.version,M.onUpdate&&M.onUpdate(M)}b.__version=M.version}function Ae(b,M,k,q,j,Z){const Re=s.convert(k.format,k.colorSpace),he=s.convert(k.type),xe=y(k.internalFormat,Re,he,k.colorSpace),je=n.get(M),ie=n.get(k);if(ie.__renderTarget=M,!je.__hasExternalTextures){const Ee=Math.max(1,M.width>>Z),Ne=Math.max(1,M.height>>Z);j===i.TEXTURE_3D||j===i.TEXTURE_2D_ARRAY?t.texImage3D(j,Z,xe,Ee,Ne,M.depth,0,Re,he,null):t.texImage2D(j,Z,xe,Ee,Ne,0,Re,he,null)}t.bindFramebuffer(i.FRAMEBUFFER,b),Me(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,q,j,ie.__webglTexture,0,te(M)):(j===i.TEXTURE_2D||j>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&j<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,q,j,ie.__webglTexture,Z),t.bindFramebuffer(i.FRAMEBUFFER,null)}function ce(b,M,k){if(i.bindRenderbuffer(i.RENDERBUFFER,b),M.depthBuffer){const q=M.depthTexture,j=q&&q.isDepthTexture?q.type:null,Z=v(M.stencilBuffer,j),Re=M.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,he=te(M);Me(M)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,he,Z,M.width,M.height):k?i.renderbufferStorageMultisample(i.RENDERBUFFER,he,Z,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,Z,M.width,M.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Re,i.RENDERBUFFER,b)}else{const q=M.textures;for(let j=0;j<q.length;j++){const Z=q[j],Re=s.convert(Z.format,Z.colorSpace),he=s.convert(Z.type),xe=y(Z.internalFormat,Re,he,Z.colorSpace),je=te(M);k&&Me(M)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,je,xe,M.width,M.height):Me(M)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,je,xe,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,xe,M.width,M.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Le(b,M){if(M&&M.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,b),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const q=n.get(M.depthTexture);q.__renderTarget=M,(!q.__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),X(M.depthTexture,0);const j=q.__webglTexture,Z=te(M);if(M.depthTexture.format===Yi)Me(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,j,0,Z):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,j,0);else if(M.depthTexture.format===rr)Me(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,j,0,Z):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,j,0);else throw new Error("Unknown depthTexture format")}function nt(b){const M=n.get(b),k=b.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==b.depthTexture){const q=b.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),q){const j=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,q.removeEventListener("dispose",j)};q.addEventListener("dispose",j),M.__depthDisposeCallback=j}M.__boundDepthTexture=q}if(b.depthTexture&&!M.__autoAllocateDepthBuffer){if(k)throw new Error("target.depthTexture not supported in Cube render targets");Le(M.__webglFramebuffer,b)}else if(k){M.__webglDepthbuffer=[];for(let q=0;q<6;q++)if(t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer[q]),M.__webglDepthbuffer[q]===void 0)M.__webglDepthbuffer[q]=i.createRenderbuffer(),ce(M.__webglDepthbuffer[q],b,!1);else{const j=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Z=M.__webglDepthbuffer[q];i.bindRenderbuffer(i.RENDERBUFFER,Z),i.framebufferRenderbuffer(i.FRAMEBUFFER,j,i.RENDERBUFFER,Z)}}else if(t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=i.createRenderbuffer(),ce(M.__webglDepthbuffer,b,!1);else{const q=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,j=M.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,j),i.framebufferRenderbuffer(i.FRAMEBUFFER,q,i.RENDERBUFFER,j)}t.bindFramebuffer(i.FRAMEBUFFER,null)}function Pe(b,M,k){const q=n.get(b);M!==void 0&&Ae(q.__webglFramebuffer,b,b.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),k!==void 0&&nt(b)}function ot(b){const M=b.texture,k=n.get(b),q=n.get(M);b.addEventListener("dispose",C);const j=b.textures,Z=b.isWebGLCubeRenderTarget===!0,Re=j.length>1;if(Re||(q.__webglTexture===void 0&&(q.__webglTexture=i.createTexture()),q.__version=M.version,a.memory.textures++),Z){k.__webglFramebuffer=[];for(let he=0;he<6;he++)if(M.mipmaps&&M.mipmaps.length>0){k.__webglFramebuffer[he]=[];for(let xe=0;xe<M.mipmaps.length;xe++)k.__webglFramebuffer[he][xe]=i.createFramebuffer()}else k.__webglFramebuffer[he]=i.createFramebuffer()}else{if(M.mipmaps&&M.mipmaps.length>0){k.__webglFramebuffer=[];for(let he=0;he<M.mipmaps.length;he++)k.__webglFramebuffer[he]=i.createFramebuffer()}else k.__webglFramebuffer=i.createFramebuffer();if(Re)for(let he=0,xe=j.length;he<xe;he++){const je=n.get(j[he]);je.__webglTexture===void 0&&(je.__webglTexture=i.createTexture(),a.memory.textures++)}if(b.samples>0&&Me(b)===!1){k.__webglMultisampledFramebuffer=i.createFramebuffer(),k.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,k.__webglMultisampledFramebuffer);for(let he=0;he<j.length;he++){const xe=j[he];k.__webglColorRenderbuffer[he]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,k.__webglColorRenderbuffer[he]);const je=s.convert(xe.format,xe.colorSpace),ie=s.convert(xe.type),Ee=y(xe.internalFormat,je,ie,xe.colorSpace,b.isXRRenderTarget===!0),Ne=te(b);i.renderbufferStorageMultisample(i.RENDERBUFFER,Ne,Ee,b.width,b.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+he,i.RENDERBUFFER,k.__webglColorRenderbuffer[he])}i.bindRenderbuffer(i.RENDERBUFFER,null),b.depthBuffer&&(k.__webglDepthRenderbuffer=i.createRenderbuffer(),ce(k.__webglDepthRenderbuffer,b,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Z){t.bindTexture(i.TEXTURE_CUBE_MAP,q.__webglTexture),Ue(i.TEXTURE_CUBE_MAP,M);for(let he=0;he<6;he++)if(M.mipmaps&&M.mipmaps.length>0)for(let xe=0;xe<M.mipmaps.length;xe++)Ae(k.__webglFramebuffer[he][xe],b,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+he,xe);else Ae(k.__webglFramebuffer[he],b,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+he,0);m(M)&&p(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Re){for(let he=0,xe=j.length;he<xe;he++){const je=j[he],ie=n.get(je);t.bindTexture(i.TEXTURE_2D,ie.__webglTexture),Ue(i.TEXTURE_2D,je),Ae(k.__webglFramebuffer,b,je,i.COLOR_ATTACHMENT0+he,i.TEXTURE_2D,0),m(je)&&p(i.TEXTURE_2D)}t.unbindTexture()}else{let he=i.TEXTURE_2D;if((b.isWebGL3DRenderTarget||b.isWebGLArrayRenderTarget)&&(he=b.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(he,q.__webglTexture),Ue(he,M),M.mipmaps&&M.mipmaps.length>0)for(let xe=0;xe<M.mipmaps.length;xe++)Ae(k.__webglFramebuffer[xe],b,M,i.COLOR_ATTACHMENT0,he,xe);else Ae(k.__webglFramebuffer,b,M,i.COLOR_ATTACHMENT0,he,0);m(M)&&p(he),t.unbindTexture()}b.depthBuffer&&nt(b)}function ee(b){const M=b.textures;for(let k=0,q=M.length;k<q;k++){const j=M[k];if(m(j)){const Z=T(b),Re=n.get(j).__webglTexture;t.bindTexture(Z,Re),p(Z),t.unbindTexture()}}}const Q=[],A=[];function Ce(b){if(b.samples>0){if(Me(b)===!1){const M=b.textures,k=b.width,q=b.height;let j=i.COLOR_BUFFER_BIT;const Z=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Re=n.get(b),he=M.length>1;if(he)for(let xe=0;xe<M.length;xe++)t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+xe,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+xe,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Re.__webglMultisampledFramebuffer),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Re.__webglFramebuffer);for(let xe=0;xe<M.length;xe++){if(b.resolveDepthBuffer&&(b.depthBuffer&&(j|=i.DEPTH_BUFFER_BIT),b.stencilBuffer&&b.resolveStencilBuffer&&(j|=i.STENCIL_BUFFER_BIT)),he){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Re.__webglColorRenderbuffer[xe]);const je=n.get(M[xe]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,je,0)}i.blitFramebuffer(0,0,k,q,0,0,k,q,j,i.NEAREST),c===!0&&(Q.length=0,A.length=0,Q.push(i.COLOR_ATTACHMENT0+xe),b.depthBuffer&&b.resolveDepthBuffer===!1&&(Q.push(Z),A.push(Z),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,A)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Q))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),he)for(let xe=0;xe<M.length;xe++){t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+xe,i.RENDERBUFFER,Re.__webglColorRenderbuffer[xe]);const je=n.get(M[xe]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Re.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+xe,i.TEXTURE_2D,je,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Re.__webglMultisampledFramebuffer)}else if(b.depthBuffer&&b.resolveDepthBuffer===!1&&c){const M=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[M])}}}function te(b){return Math.min(r.maxSamples,b.samples)}function Me(b){const M=n.get(b);return b.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function oe(b){const M=a.render.frame;u.get(b)!==M&&(u.set(b,M),b.update())}function Fe(b,M){const k=b.colorSpace,q=b.format,j=b.type;return b.isCompressedTexture===!0||b.isVideoTexture===!0||k!==sr&&k!==qn&&(st.getTransfer(k)===pt?(q!==fn||j!==Un)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",k)),M}function me(b){return typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement?(l.width=b.naturalWidth||b.width,l.height=b.naturalHeight||b.height):typeof VideoFrame<"u"&&b instanceof VideoFrame?(l.width=b.displayWidth,l.height=b.displayHeight):(l.width=b.width,l.height=b.height),l}this.allocateTextureUnit=U,this.resetTextureUnits=z,this.setTexture2D=X,this.setTexture2DArray=G,this.setTexture3D=K,this.setTextureCube=O,this.rebindTextures=Pe,this.setupRenderTarget=ot,this.updateRenderTargetMipmap=ee,this.updateMultisampleRenderTarget=Ce,this.setupDepthRenderbuffer=nt,this.setupFrameBufferTexture=Ae,this.useMultisampledRTT=Me}function D0(i,e){function t(n,r=qn){let s;const a=st.getTransfer(r);if(n===Un)return i.UNSIGNED_BYTE;if(n===Zo)return i.UNSIGNED_SHORT_4_4_4_4;if(n===$o)return i.UNSIGNED_SHORT_5_5_5_1;if(n===jl)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===$l)return i.BYTE;if(n===Kl)return i.SHORT;if(n===Lr)return i.UNSIGNED_SHORT;if(n===qo)return i.INT;if(n===gi)return i.UNSIGNED_INT;if(n===Ln)return i.FLOAT;if(n===Or)return i.HALF_FLOAT;if(n===Jl)return i.ALPHA;if(n===Ql)return i.RGB;if(n===fn)return i.RGBA;if(n===eu)return i.LUMINANCE;if(n===tu)return i.LUMINANCE_ALPHA;if(n===Yi)return i.DEPTH_COMPONENT;if(n===rr)return i.DEPTH_STENCIL;if(n===nu)return i.RED;if(n===Ko)return i.RED_INTEGER;if(n===iu)return i.RG;if(n===jo)return i.RG_INTEGER;if(n===Jo)return i.RGBA_INTEGER;if(n===Ss||n===Es||n===Ts||n===bs)if(a===pt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===Ss)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Es)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Ts)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===bs)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===Ss)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Es)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Ts)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===bs)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===oo||n===co||n===lo||n===uo)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===oo)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===co)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===lo)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===uo)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===ho||n===fo||n===po)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===ho||n===fo)return a===pt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===po)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===mo||n===go||n===_o||n===vo||n===xo||n===Mo||n===yo||n===So||n===Eo||n===To||n===bo||n===Ao||n===wo||n===Ro)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===mo)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===go)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===_o)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===vo)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===xo)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Mo)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===yo)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===So)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Eo)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===To)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===bo)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Ao)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===wo)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ro)return a===pt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===As||n===Co||n===Po)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===As)return a===pt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Co)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Po)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===ru||n===Lo||n===Io||n===Do)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===As)return s.COMPRESSED_RED_RGTC1_EXT;if(n===Lo)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Io)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Do)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===ir?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const N0=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,U0=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class F0{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,n){if(this.texture===null){const r=new Nt,s=e.properties.get(r);s.__webglTexture=t.texture,(t.depthNear!==n.depthNear||t.depthFar!==n.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new ei({vertexShader:N0,fragmentShader:U0,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new mt(new qs(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class O0 extends cr{constructor(e,t){super();const n=this;let r=null,s=1,a=null,o="local-floor",c=1,l=null,u=null,h=null,d=null,f=null,g=null;const _=new F0,m=t.getContextAttributes();let p=null,T=null;const y=[],v=[],L=new le;let R=null;const C=new rn;C.viewport=new At;const I=new rn;I.viewport=new At;const E=[C,I],x=new ip;let P=null,z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Y){let ae=y[Y];return ae===void 0&&(ae=new va,y[Y]=ae),ae.getTargetRaySpace()},this.getControllerGrip=function(Y){let ae=y[Y];return ae===void 0&&(ae=new va,y[Y]=ae),ae.getGripSpace()},this.getHand=function(Y){let ae=y[Y];return ae===void 0&&(ae=new va,y[Y]=ae),ae.getHandSpace()};function U(Y){const ae=v.indexOf(Y.inputSource);if(ae===-1)return;const Ae=y[ae];Ae!==void 0&&(Ae.update(Y.inputSource,Y.frame,l||a),Ae.dispatchEvent({type:Y.type,data:Y.inputSource}))}function B(){r.removeEventListener("select",U),r.removeEventListener("selectstart",U),r.removeEventListener("selectend",U),r.removeEventListener("squeeze",U),r.removeEventListener("squeezestart",U),r.removeEventListener("squeezeend",U),r.removeEventListener("end",B),r.removeEventListener("inputsourceschange",X);for(let Y=0;Y<y.length;Y++){const ae=v[Y];ae!==null&&(v[Y]=null,y[Y].disconnect(ae))}P=null,z=null,_.reset(),e.setRenderTarget(p),f=null,d=null,h=null,r=null,T=null,Qe.stop(),n.isPresenting=!1,e.setPixelRatio(R),e.setSize(L.width,L.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Y){s=Y,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Y){o=Y,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(Y){l=Y},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return h},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(Y){if(r=Y,r!==null){if(p=e.getRenderTarget(),r.addEventListener("select",U),r.addEventListener("selectstart",U),r.addEventListener("selectend",U),r.addEventListener("squeeze",U),r.addEventListener("squeezestart",U),r.addEventListener("squeezeend",U),r.addEventListener("end",B),r.addEventListener("inputsourceschange",X),m.xrCompatible!==!0&&await t.makeXRCompatible(),R=e.getPixelRatio(),e.getSize(L),typeof XRWebGLBinding<"u"&&"createProjectionLayer"in XRWebGLBinding.prototype){let Ae=null,ce=null,Le=null;m.depth&&(Le=m.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,Ae=m.stencil?rr:Yi,ce=m.stencil?ir:gi);const nt={colorFormat:t.RGBA8,depthFormat:Le,scaleFactor:s};h=new XRWebGLBinding(r,t),d=h.createProjectionLayer(nt),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),T=new _i(d.textureWidth,d.textureHeight,{format:fn,type:Un,depthTexture:new yu(d.textureWidth,d.textureHeight,ce,void 0,void 0,void 0,void 0,void 0,void 0,Ae),stencilBuffer:m.stencil,colorSpace:e.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1})}else{const Ae={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(r,t,Ae),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),T=new _i(f.framebufferWidth,f.framebufferHeight,{format:fn,type:Un,colorSpace:e.outputColorSpace,stencilBuffer:m.stencil})}T.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await r.requestReferenceSpace(o),Qe.setContext(r),Qe.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function X(Y){for(let ae=0;ae<Y.removed.length;ae++){const Ae=Y.removed[ae],ce=v.indexOf(Ae);ce>=0&&(v[ce]=null,y[ce].disconnect(Ae))}for(let ae=0;ae<Y.added.length;ae++){const Ae=Y.added[ae];let ce=v.indexOf(Ae);if(ce===-1){for(let nt=0;nt<y.length;nt++)if(nt>=v.length){v.push(Ae),ce=nt;break}else if(v[nt]===null){v[nt]=Ae,ce=nt;break}if(ce===-1)break}const Le=y[ce];Le&&Le.connect(Ae)}}const G=new w,K=new w;function O(Y,ae,Ae){G.setFromMatrixPosition(ae.matrixWorld),K.setFromMatrixPosition(Ae.matrixWorld);const ce=G.distanceTo(K),Le=ae.projectionMatrix.elements,nt=Ae.projectionMatrix.elements,Pe=Le[14]/(Le[10]-1),ot=Le[14]/(Le[10]+1),ee=(Le[9]+1)/Le[5],Q=(Le[9]-1)/Le[5],A=(Le[8]-1)/Le[0],Ce=(nt[8]+1)/nt[0],te=Pe*A,Me=Pe*Ce,oe=ce/(-A+Ce),Fe=oe*-A;if(ae.matrixWorld.decompose(Y.position,Y.quaternion,Y.scale),Y.translateX(Fe),Y.translateZ(oe),Y.matrixWorld.compose(Y.position,Y.quaternion,Y.scale),Y.matrixWorldInverse.copy(Y.matrixWorld).invert(),Le[10]===-1)Y.projectionMatrix.copy(ae.projectionMatrix),Y.projectionMatrixInverse.copy(ae.projectionMatrixInverse);else{const me=Pe+oe,b=ot+oe,M=te-Fe,k=Me+(ce-Fe),q=ee*ot/b*me,j=Q*ot/b*me;Y.projectionMatrix.makePerspective(M,k,q,j,me,b),Y.projectionMatrixInverse.copy(Y.projectionMatrix).invert()}}function J(Y,ae){ae===null?Y.matrixWorld.copy(Y.matrix):Y.matrixWorld.multiplyMatrices(ae.matrixWorld,Y.matrix),Y.matrixWorldInverse.copy(Y.matrixWorld).invert()}this.updateCamera=function(Y){if(r===null)return;let ae=Y.near,Ae=Y.far;_.texture!==null&&(_.depthNear>0&&(ae=_.depthNear),_.depthFar>0&&(Ae=_.depthFar)),x.near=I.near=C.near=ae,x.far=I.far=C.far=Ae,(P!==x.near||z!==x.far)&&(r.updateRenderState({depthNear:x.near,depthFar:x.far}),P=x.near,z=x.far),C.layers.mask=Y.layers.mask|2,I.layers.mask=Y.layers.mask|4,x.layers.mask=C.layers.mask|I.layers.mask;const ce=Y.parent,Le=x.cameras;J(x,ce);for(let nt=0;nt<Le.length;nt++)J(Le[nt],ce);Le.length===2?O(x,C,I):x.projectionMatrix.copy(C.projectionMatrix),se(Y,x,ce)};function se(Y,ae,Ae){Ae===null?Y.matrix.copy(ae.matrixWorld):(Y.matrix.copy(Ae.matrixWorld),Y.matrix.invert(),Y.matrix.multiply(ae.matrixWorld)),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale),Y.updateMatrixWorld(!0),Y.projectionMatrix.copy(ae.projectionMatrix),Y.projectionMatrixInverse.copy(ae.projectionMatrixInverse),Y.isPerspectiveCamera&&(Y.fov=Ir*2*Math.atan(1/Y.projectionMatrix.elements[5]),Y.zoom=1)}this.getCamera=function(){return x},this.getFoveation=function(){if(!(d===null&&f===null))return c},this.setFoveation=function(Y){c=Y,d!==null&&(d.fixedFoveation=Y),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=Y)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(x)};let ve=null;function Ue(Y,ae){if(u=ae.getViewerPose(l||a),g=ae,u!==null){const Ae=u.views;f!==null&&(e.setRenderTargetFramebuffer(T,f.framebuffer),e.setRenderTarget(T));let ce=!1;Ae.length!==x.cameras.length&&(x.cameras.length=0,ce=!0);for(let Pe=0;Pe<Ae.length;Pe++){const ot=Ae[Pe];let ee=null;if(f!==null)ee=f.getViewport(ot);else{const A=h.getViewSubImage(d,ot);ee=A.viewport,Pe===0&&(e.setRenderTargetTextures(T,A.colorTexture,d.ignoreDepthValues?void 0:A.depthStencilTexture),e.setRenderTarget(T))}let Q=E[Pe];Q===void 0&&(Q=new rn,Q.layers.enable(Pe),Q.viewport=new At,E[Pe]=Q),Q.matrix.fromArray(ot.transform.matrix),Q.matrix.decompose(Q.position,Q.quaternion,Q.scale),Q.projectionMatrix.fromArray(ot.projectionMatrix),Q.projectionMatrixInverse.copy(Q.projectionMatrix).invert(),Q.viewport.set(ee.x,ee.y,ee.width,ee.height),Pe===0&&(x.matrix.copy(Q.matrix),x.matrix.decompose(x.position,x.quaternion,x.scale)),ce===!0&&x.cameras.push(Q)}const Le=r.enabledFeatures;if(Le&&Le.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&h){const Pe=h.getDepthInformation(Ae[0]);Pe&&Pe.isValid&&Pe.texture&&_.init(e,Pe,r.renderState)}}for(let Ae=0;Ae<y.length;Ae++){const ce=v[Ae],Le=y[Ae];ce!==null&&Le!==void 0&&Le.update(ce,ae,l||a)}ve&&ve(Y,ae),ae.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ae}),g=null}const Qe=new Cu;Qe.setAnimationLoop(Ue),this.setAnimationLoop=function(Y){ve=Y},this.dispose=function(){}}}const ci=new Fn,k0=new St;function B0(i,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,mu(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function r(m,p,T,y,v){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(m,p):p.isMeshToonMaterial?(s(m,p),h(m,p)):p.isMeshPhongMaterial?(s(m,p),u(m,p)):p.isMeshStandardMaterial?(s(m,p),d(m,p),p.isMeshPhysicalMaterial&&f(m,p,v)):p.isMeshMatcapMaterial?(s(m,p),g(m,p)):p.isMeshDepthMaterial?s(m,p):p.isMeshDistanceMaterial?(s(m,p),_(m,p)):p.isMeshNormalMaterial?s(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?c(m,p,T,y):p.isSpriteMaterial?l(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Zt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Zt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const T=e.get(p),y=T.envMap,v=T.envMapRotation;y&&(m.envMap.value=y,ci.copy(v),ci.x*=-1,ci.y*=-1,ci.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(ci.y*=-1,ci.z*=-1),m.envMapRotation.value.setFromMatrix4(k0.makeRotationFromEuler(ci)),m.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function c(m,p,T,y){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*T,m.scale.value=y*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function l(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function u(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function h(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,T){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Zt&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=T.texture,m.transmissionSamplerSize.value.set(T.width,T.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function _(m,p){const T=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(T.matrixWorld),m.nearDistance.value=T.shadow.camera.near,m.farDistance.value=T.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function z0(i,e,t,n){let r={},s={},a=[];const o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(T,y){const v=y.program;n.uniformBlockBinding(T,v)}function l(T,y){let v=r[T.id];v===void 0&&(g(T),v=u(T),r[T.id]=v,T.addEventListener("dispose",m));const L=y.program;n.updateUBOMapping(T,L);const R=e.render.frame;s[T.id]!==R&&(d(T),s[T.id]=R)}function u(T){const y=h();T.__bindingPointIndex=y;const v=i.createBuffer(),L=T.__size,R=T.usage;return i.bindBuffer(i.UNIFORM_BUFFER,v),i.bufferData(i.UNIFORM_BUFFER,L,R),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,y,v),v}function h(){for(let T=0;T<o;T++)if(a.indexOf(T)===-1)return a.push(T),T;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(T){const y=r[T.id],v=T.uniforms,L=T.__cache;i.bindBuffer(i.UNIFORM_BUFFER,y);for(let R=0,C=v.length;R<C;R++){const I=Array.isArray(v[R])?v[R]:[v[R]];for(let E=0,x=I.length;E<x;E++){const P=I[E];if(f(P,R,E,L)===!0){const z=P.__offset,U=Array.isArray(P.value)?P.value:[P.value];let B=0;for(let X=0;X<U.length;X++){const G=U[X],K=_(G);typeof G=="number"||typeof G=="boolean"?(P.__data[0]=G,i.bufferSubData(i.UNIFORM_BUFFER,z+B,P.__data)):G.isMatrix3?(P.__data[0]=G.elements[0],P.__data[1]=G.elements[1],P.__data[2]=G.elements[2],P.__data[3]=0,P.__data[4]=G.elements[3],P.__data[5]=G.elements[4],P.__data[6]=G.elements[5],P.__data[7]=0,P.__data[8]=G.elements[6],P.__data[9]=G.elements[7],P.__data[10]=G.elements[8],P.__data[11]=0):(G.toArray(P.__data,B),B+=K.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,z,P.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(T,y,v,L){const R=T.value,C=y+"_"+v;if(L[C]===void 0)return typeof R=="number"||typeof R=="boolean"?L[C]=R:L[C]=R.clone(),!0;{const I=L[C];if(typeof R=="number"||typeof R=="boolean"){if(I!==R)return L[C]=R,!0}else if(I.equals(R)===!1)return I.copy(R),!0}return!1}function g(T){const y=T.uniforms;let v=0;const L=16;for(let C=0,I=y.length;C<I;C++){const E=Array.isArray(y[C])?y[C]:[y[C]];for(let x=0,P=E.length;x<P;x++){const z=E[x],U=Array.isArray(z.value)?z.value:[z.value];for(let B=0,X=U.length;B<X;B++){const G=U[B],K=_(G),O=v%L,J=O%K.boundary,se=O+J;v+=J,se!==0&&L-se<K.storage&&(v+=L-se),z.__data=new Float32Array(K.storage/Float32Array.BYTES_PER_ELEMENT),z.__offset=v,v+=K.storage}}}const R=v%L;return R>0&&(v+=L-R),T.__size=v,T.__cache={},this}function _(T){const y={boundary:0,storage:0};return typeof T=="number"||typeof T=="boolean"?(y.boundary=4,y.storage=4):T.isVector2?(y.boundary=8,y.storage=8):T.isVector3||T.isColor?(y.boundary=16,y.storage=12):T.isVector4?(y.boundary=16,y.storage=16):T.isMatrix3?(y.boundary=48,y.storage=48):T.isMatrix4?(y.boundary=64,y.storage=64):T.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",T),y}function m(T){const y=T.target;y.removeEventListener("dispose",m);const v=a.indexOf(y.__bindingPointIndex);a.splice(v,1),i.deleteBuffer(r[y.id]),delete r[y.id],delete s[y.id]}function p(){for(const T in r)i.deleteBuffer(r[T]);a=[],r={},s={}}return{bind:c,update:l,dispose:p}}class G0{constructor(e={}){const{canvas:t=Wd(),context:n=null,depth:r=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1,reverseDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=a;const g=new Uint32Array(4),_=new Int32Array(4);let m=null,p=null;const T=[],y=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=nn,this.toneMapping=jn,this.toneMappingExposure=1;const v=this;let L=!1,R=0,C=0,I=null,E=-1,x=null;const P=new At,z=new At;let U=null;const B=new tt(0);let X=0,G=t.width,K=t.height,O=1,J=null,se=null;const ve=new At(0,0,G,K),Ue=new At(0,0,G,K);let Qe=!1;const Y=new Mu;let ae=!1,Ae=!1;this.transmissionResolutionScale=1;const ce=new St,Le=new St,nt=new w,Pe=new At,ot={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ee=!1;function Q(){return I===null?O:1}let A=n;function Ce(S,N){return t.getContext(S,N)}try{const S={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Yo}`),t.addEventListener("webglcontextlost",$,!1),t.addEventListener("webglcontextrestored",_e,!1),t.addEventListener("webglcontextcreationerror",ge,!1),A===null){const N="webgl2";if(A=Ce(N,S),A===null)throw Ce(N)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(S){throw console.error("THREE.WebGLRenderer: "+S.message),S}let te,Me,oe,Fe,me,b,M,k,q,j,Z,Re,he,xe,je,ie,Ee,Ne,ke,Te,et,We,gt,D;function de(){te=new jg(A),te.init(),We=new D0(A,te),Me=new Xg(A,te,e,We),oe=new L0(A,te),Me.reverseDepthBuffer&&d&&oe.buffers.depth.setReversed(!0),Fe=new e_(A),me=new v0,b=new I0(A,te,oe,me,Me,We,Fe),M=new qg(v),k=new Kg(v),q=new op(A),gt=new Hg(A,q),j=new Jg(A,q,Fe,gt),Z=new n_(A,j,q,Fe),ke=new t_(A,Me,b),ie=new Yg(me),Re=new _0(v,M,k,te,Me,gt,ie),he=new B0(v,me),xe=new M0,je=new A0(te),Ne=new Vg(v,M,k,oe,Z,f,c),Ee=new C0(v,Z,Me),D=new z0(A,Fe,Me,oe),Te=new Wg(A,te,Fe),et=new Qg(A,te,Fe),Fe.programs=Re.programs,v.capabilities=Me,v.extensions=te,v.properties=me,v.renderLists=xe,v.shadowMap=Ee,v.state=oe,v.info=Fe}de();const W=new O0(v,A);this.xr=W,this.getContext=function(){return A},this.getContextAttributes=function(){return A.getContextAttributes()},this.forceContextLoss=function(){const S=te.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){const S=te.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return O},this.setPixelRatio=function(S){S!==void 0&&(O=S,this.setSize(G,K,!1))},this.getSize=function(S){return S.set(G,K)},this.setSize=function(S,N,V=!0){if(W.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}G=S,K=N,t.width=Math.floor(S*O),t.height=Math.floor(N*O),V===!0&&(t.style.width=S+"px",t.style.height=N+"px"),this.setViewport(0,0,S,N)},this.getDrawingBufferSize=function(S){return S.set(G*O,K*O).floor()},this.setDrawingBufferSize=function(S,N,V){G=S,K=N,O=V,t.width=Math.floor(S*V),t.height=Math.floor(N*V),this.setViewport(0,0,S,N)},this.getCurrentViewport=function(S){return S.copy(P)},this.getViewport=function(S){return S.copy(ve)},this.setViewport=function(S,N,V,H){S.isVector4?ve.set(S.x,S.y,S.z,S.w):ve.set(S,N,V,H),oe.viewport(P.copy(ve).multiplyScalar(O).round())},this.getScissor=function(S){return S.copy(Ue)},this.setScissor=function(S,N,V,H){S.isVector4?Ue.set(S.x,S.y,S.z,S.w):Ue.set(S,N,V,H),oe.scissor(z.copy(Ue).multiplyScalar(O).round())},this.getScissorTest=function(){return Qe},this.setScissorTest=function(S){oe.setScissorTest(Qe=S)},this.setOpaqueSort=function(S){J=S},this.setTransparentSort=function(S){se=S},this.getClearColor=function(S){return S.copy(Ne.getClearColor())},this.setClearColor=function(){Ne.setClearColor.apply(Ne,arguments)},this.getClearAlpha=function(){return Ne.getClearAlpha()},this.setClearAlpha=function(){Ne.setClearAlpha.apply(Ne,arguments)},this.clear=function(S=!0,N=!0,V=!0){let H=0;if(S){let F=!1;if(I!==null){const ne=I.texture.format;F=ne===Jo||ne===jo||ne===Ko}if(F){const ne=I.texture.type,fe=ne===Un||ne===gi||ne===Lr||ne===ir||ne===Zo||ne===$o,ye=Ne.getClearColor(),be=Ne.getClearAlpha(),Be=ye.r,Ge=ye.g,Ie=ye.b;fe?(g[0]=Be,g[1]=Ge,g[2]=Ie,g[3]=be,A.clearBufferuiv(A.COLOR,0,g)):(_[0]=Be,_[1]=Ge,_[2]=Ie,_[3]=be,A.clearBufferiv(A.COLOR,0,_))}else H|=A.COLOR_BUFFER_BIT}N&&(H|=A.DEPTH_BUFFER_BIT),V&&(H|=A.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),A.clear(H)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",$,!1),t.removeEventListener("webglcontextrestored",_e,!1),t.removeEventListener("webglcontextcreationerror",ge,!1),Ne.dispose(),xe.dispose(),je.dispose(),me.dispose(),M.dispose(),k.dispose(),Z.dispose(),gt.dispose(),D.dispose(),Re.dispose(),W.dispose(),W.removeEventListener("sessionstart",ac),W.removeEventListener("sessionend",oc),ti.stop()};function $(S){S.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),L=!0}function _e(){console.log("THREE.WebGLRenderer: Context Restored."),L=!1;const S=Fe.autoReset,N=Ee.enabled,V=Ee.autoUpdate,H=Ee.needsUpdate,F=Ee.type;de(),Fe.autoReset=S,Ee.enabled=N,Ee.autoUpdate=V,Ee.needsUpdate=H,Ee.type=F}function ge(S){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function Ve(S){const N=S.target;N.removeEventListener("dispose",Ve),Et(N)}function Et(S){Ut(S),me.remove(S)}function Ut(S){const N=me.get(S).programs;N!==void 0&&(N.forEach(function(V){Re.releaseProgram(V)}),S.isShaderMaterial&&Re.releaseShaderCache(S))}this.renderBufferDirect=function(S,N,V,H,F,ne){N===null&&(N=ot);const fe=F.isMesh&&F.matrixWorld.determinant()<0,ye=ju(S,N,V,H,F);oe.setMaterial(H,fe);let be=V.index,Be=1;if(H.wireframe===!0){if(be=j.getWireframeAttribute(V),be===void 0)return;Be=2}const Ge=V.drawRange,Ie=V.attributes.position;let it=Ge.start*Be,ct=(Ge.start+Ge.count)*Be;ne!==null&&(it=Math.max(it,ne.start*Be),ct=Math.min(ct,(ne.start+ne.count)*Be)),be!==null?(it=Math.max(it,0),ct=Math.min(ct,be.count)):Ie!=null&&(it=Math.max(it,0),ct=Math.min(ct,Ie.count));const wt=ct-it;if(wt<0||wt===1/0)return;gt.setup(F,H,ye,V,be);let Tt,rt=Te;if(be!==null&&(Tt=q.get(be),rt=et,rt.setIndex(Tt)),F.isMesh)H.wireframe===!0?(oe.setLineWidth(H.wireframeLinewidth*Q()),rt.setMode(A.LINES)):rt.setMode(A.TRIANGLES);else if(F.isLine){let De=H.linewidth;De===void 0&&(De=1),oe.setLineWidth(De*Q()),F.isLineSegments?rt.setMode(A.LINES):F.isLineLoop?rt.setMode(A.LINE_LOOP):rt.setMode(A.LINE_STRIP)}else F.isPoints?rt.setMode(A.POINTS):F.isSprite&&rt.setMode(A.TRIANGLES);if(F.isBatchedMesh)if(F._multiDrawInstances!==null)rt.renderMultiDrawInstances(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount,F._multiDrawInstances);else if(te.get("WEBGL_multi_draw"))rt.renderMultiDraw(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount);else{const De=F._multiDrawStarts,Dt=F._multiDrawCounts,lt=F._multiDrawCount,cn=be?q.get(be).bytesPerElement:1,yi=me.get(H).currentProgram.getUniforms();for(let $t=0;$t<lt;$t++)yi.setValue(A,"_gl_DrawID",$t),rt.render(De[$t]/cn,Dt[$t])}else if(F.isInstancedMesh)rt.renderInstances(it,wt,F.count);else if(V.isInstancedBufferGeometry){const De=V._maxInstanceCount!==void 0?V._maxInstanceCount:1/0,Dt=Math.min(V.instanceCount,De);rt.renderInstances(it,wt,Dt)}else rt.render(it,wt)};function ut(S,N,V){S.transparent===!0&&S.side===bt&&S.forceSinglePass===!1?(S.side=Zt,S.needsUpdate=!0,Vr(S,N,V),S.side=Qn,S.needsUpdate=!0,Vr(S,N,V),S.side=bt):Vr(S,N,V)}this.compile=function(S,N,V=null){V===null&&(V=S),p=je.get(V),p.init(N),y.push(p),V.traverseVisible(function(F){F.isLight&&F.layers.test(N.layers)&&(p.pushLight(F),F.castShadow&&p.pushShadow(F))}),S!==V&&S.traverseVisible(function(F){F.isLight&&F.layers.test(N.layers)&&(p.pushLight(F),F.castShadow&&p.pushShadow(F))}),p.setupLights();const H=new Set;return S.traverse(function(F){if(!(F.isMesh||F.isPoints||F.isLine||F.isSprite))return;const ne=F.material;if(ne)if(Array.isArray(ne))for(let fe=0;fe<ne.length;fe++){const ye=ne[fe];ut(ye,V,F),H.add(ye)}else ut(ne,V,F),H.add(ne)}),y.pop(),p=null,H},this.compileAsync=function(S,N,V=null){const H=this.compile(S,N,V);return new Promise(F=>{function ne(){if(H.forEach(function(fe){me.get(fe).currentProgram.isReady()&&H.delete(fe)}),H.size===0){F(S);return}setTimeout(ne,10)}te.get("KHR_parallel_shader_compile")!==null?ne():setTimeout(ne,10)})};let on=null;function En(S){on&&on(S)}function ac(){ti.stop()}function oc(){ti.start()}const ti=new Cu;ti.setAnimationLoop(En),typeof self<"u"&&ti.setContext(self),this.setAnimationLoop=function(S){on=S,W.setAnimationLoop(S),S===null?ti.stop():ti.start()},W.addEventListener("sessionstart",ac),W.addEventListener("sessionend",oc),this.render=function(S,N){if(N!==void 0&&N.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(L===!0)return;if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),N.parent===null&&N.matrixWorldAutoUpdate===!0&&N.updateMatrixWorld(),W.enabled===!0&&W.isPresenting===!0&&(W.cameraAutoUpdate===!0&&W.updateCamera(N),N=W.getCamera()),S.isScene===!0&&S.onBeforeRender(v,S,N,I),p=je.get(S,y.length),p.init(N),y.push(p),Le.multiplyMatrices(N.projectionMatrix,N.matrixWorldInverse),Y.setFromProjectionMatrix(Le),Ae=this.localClippingEnabled,ae=ie.init(this.clippingPlanes,Ae),m=xe.get(S,T.length),m.init(),T.push(m),W.enabled===!0&&W.isPresenting===!0){const ne=v.xr.getDepthSensingMesh();ne!==null&&$s(ne,N,-1/0,v.sortObjects)}$s(S,N,0,v.sortObjects),m.finish(),v.sortObjects===!0&&m.sort(J,se),ee=W.enabled===!1||W.isPresenting===!1||W.hasDepthSensing()===!1,ee&&Ne.addToRenderList(m,S),this.info.render.frame++,ae===!0&&ie.beginShadows();const V=p.state.shadowsArray;Ee.render(V,S,N),ae===!0&&ie.endShadows(),this.info.autoReset===!0&&this.info.reset();const H=m.opaque,F=m.transmissive;if(p.setupLights(),N.isArrayCamera){const ne=N.cameras;if(F.length>0)for(let fe=0,ye=ne.length;fe<ye;fe++){const be=ne[fe];lc(H,F,S,be)}ee&&Ne.render(S);for(let fe=0,ye=ne.length;fe<ye;fe++){const be=ne[fe];cc(m,S,be,be.viewport)}}else F.length>0&&lc(H,F,S,N),ee&&Ne.render(S),cc(m,S,N);I!==null&&C===0&&(b.updateMultisampleRenderTarget(I),b.updateRenderTargetMipmap(I)),S.isScene===!0&&S.onAfterRender(v,S,N),gt.resetDefaultState(),E=-1,x=null,y.pop(),y.length>0?(p=y[y.length-1],ae===!0&&ie.setGlobalState(v.clippingPlanes,p.state.camera)):p=null,T.pop(),T.length>0?m=T[T.length-1]:m=null};function $s(S,N,V,H){if(S.visible===!1)return;if(S.layers.test(N.layers)){if(S.isGroup)V=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(N);else if(S.isLight)p.pushLight(S),S.castShadow&&p.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||Y.intersectsSprite(S)){H&&Pe.setFromMatrixPosition(S.matrixWorld).applyMatrix4(Le);const fe=Z.update(S),ye=S.material;ye.visible&&m.push(S,fe,ye,V,Pe.z,null)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||Y.intersectsObject(S))){const fe=Z.update(S),ye=S.material;if(H&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),Pe.copy(S.boundingSphere.center)):(fe.boundingSphere===null&&fe.computeBoundingSphere(),Pe.copy(fe.boundingSphere.center)),Pe.applyMatrix4(S.matrixWorld).applyMatrix4(Le)),Array.isArray(ye)){const be=fe.groups;for(let Be=0,Ge=be.length;Be<Ge;Be++){const Ie=be[Be],it=ye[Ie.materialIndex];it&&it.visible&&m.push(S,fe,it,V,Pe.z,Ie)}}else ye.visible&&m.push(S,fe,ye,V,Pe.z,null)}}const ne=S.children;for(let fe=0,ye=ne.length;fe<ye;fe++)$s(ne[fe],N,V,H)}function cc(S,N,V,H){const F=S.opaque,ne=S.transmissive,fe=S.transparent;p.setupLightsView(V),ae===!0&&ie.setGlobalState(v.clippingPlanes,V),H&&oe.viewport(P.copy(H)),F.length>0&&Gr(F,N,V),ne.length>0&&Gr(ne,N,V),fe.length>0&&Gr(fe,N,V),oe.buffers.depth.setTest(!0),oe.buffers.depth.setMask(!0),oe.buffers.color.setMask(!0),oe.setPolygonOffset(!1)}function lc(S,N,V,H){if((V.isScene===!0?V.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[H.id]===void 0&&(p.state.transmissionRenderTarget[H.id]=new _i(1,1,{generateMipmaps:!0,type:te.has("EXT_color_buffer_half_float")||te.has("EXT_color_buffer_float")?Or:Un,minFilter:pi,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:st.workingColorSpace}));const ne=p.state.transmissionRenderTarget[H.id],fe=H.viewport||P;ne.setSize(fe.z*v.transmissionResolutionScale,fe.w*v.transmissionResolutionScale);const ye=v.getRenderTarget();v.setRenderTarget(ne),v.getClearColor(B),X=v.getClearAlpha(),X<1&&v.setClearColor(16777215,.5),v.clear(),ee&&Ne.render(V);const be=v.toneMapping;v.toneMapping=jn;const Be=H.viewport;if(H.viewport!==void 0&&(H.viewport=void 0),p.setupLightsView(H),ae===!0&&ie.setGlobalState(v.clippingPlanes,H),Gr(S,V,H),b.updateMultisampleRenderTarget(ne),b.updateRenderTargetMipmap(ne),te.has("WEBGL_multisampled_render_to_texture")===!1){let Ge=!1;for(let Ie=0,it=N.length;Ie<it;Ie++){const ct=N[Ie],wt=ct.object,Tt=ct.geometry,rt=ct.material,De=ct.group;if(rt.side===bt&&wt.layers.test(H.layers)){const Dt=rt.side;rt.side=Zt,rt.needsUpdate=!0,uc(wt,V,H,Tt,rt,De),rt.side=Dt,rt.needsUpdate=!0,Ge=!0}}Ge===!0&&(b.updateMultisampleRenderTarget(ne),b.updateRenderTargetMipmap(ne))}v.setRenderTarget(ye),v.setClearColor(B,X),Be!==void 0&&(H.viewport=Be),v.toneMapping=be}function Gr(S,N,V){const H=N.isScene===!0?N.overrideMaterial:null;for(let F=0,ne=S.length;F<ne;F++){const fe=S[F],ye=fe.object,be=fe.geometry,Be=H===null?fe.material:H,Ge=fe.group;ye.layers.test(V.layers)&&uc(ye,N,V,be,Be,Ge)}}function uc(S,N,V,H,F,ne){S.onBeforeRender(v,N,V,H,F,ne),S.modelViewMatrix.multiplyMatrices(V.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),F.onBeforeRender(v,N,V,H,S,ne),F.transparent===!0&&F.side===bt&&F.forceSinglePass===!1?(F.side=Zt,F.needsUpdate=!0,v.renderBufferDirect(V,N,H,F,S,ne),F.side=Qn,F.needsUpdate=!0,v.renderBufferDirect(V,N,H,F,S,ne),F.side=bt):v.renderBufferDirect(V,N,H,F,S,ne),S.onAfterRender(v,N,V,H,F,ne)}function Vr(S,N,V){N.isScene!==!0&&(N=ot);const H=me.get(S),F=p.state.lights,ne=p.state.shadowsArray,fe=F.state.version,ye=Re.getParameters(S,F.state,ne,N,V),be=Re.getProgramCacheKey(ye);let Be=H.programs;H.environment=S.isMeshStandardMaterial?N.environment:null,H.fog=N.fog,H.envMap=(S.isMeshStandardMaterial?k:M).get(S.envMap||H.environment),H.envMapRotation=H.environment!==null&&S.envMap===null?N.environmentRotation:S.envMapRotation,Be===void 0&&(S.addEventListener("dispose",Ve),Be=new Map,H.programs=Be);let Ge=Be.get(be);if(Ge!==void 0){if(H.currentProgram===Ge&&H.lightsStateVersion===fe)return dc(S,ye),Ge}else ye.uniforms=Re.getUniforms(S),S.onBeforeCompile(ye,v),Ge=Re.acquireProgram(ye,be),Be.set(be,Ge),H.uniforms=ye.uniforms;const Ie=H.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Ie.clippingPlanes=ie.uniform),dc(S,ye),H.needsLights=Qu(S),H.lightsStateVersion=fe,H.needsLights&&(Ie.ambientLightColor.value=F.state.ambient,Ie.lightProbe.value=F.state.probe,Ie.directionalLights.value=F.state.directional,Ie.directionalLightShadows.value=F.state.directionalShadow,Ie.spotLights.value=F.state.spot,Ie.spotLightShadows.value=F.state.spotShadow,Ie.rectAreaLights.value=F.state.rectArea,Ie.ltc_1.value=F.state.rectAreaLTC1,Ie.ltc_2.value=F.state.rectAreaLTC2,Ie.pointLights.value=F.state.point,Ie.pointLightShadows.value=F.state.pointShadow,Ie.hemisphereLights.value=F.state.hemi,Ie.directionalShadowMap.value=F.state.directionalShadowMap,Ie.directionalShadowMatrix.value=F.state.directionalShadowMatrix,Ie.spotShadowMap.value=F.state.spotShadowMap,Ie.spotLightMatrix.value=F.state.spotLightMatrix,Ie.spotLightMap.value=F.state.spotLightMap,Ie.pointShadowMap.value=F.state.pointShadowMap,Ie.pointShadowMatrix.value=F.state.pointShadowMatrix),H.currentProgram=Ge,H.uniformsList=null,Ge}function hc(S){if(S.uniformsList===null){const N=S.currentProgram.getUniforms();S.uniformsList=ws.seqWithValue(N.seq,S.uniforms)}return S.uniformsList}function dc(S,N){const V=me.get(S);V.outputColorSpace=N.outputColorSpace,V.batching=N.batching,V.batchingColor=N.batchingColor,V.instancing=N.instancing,V.instancingColor=N.instancingColor,V.instancingMorph=N.instancingMorph,V.skinning=N.skinning,V.morphTargets=N.morphTargets,V.morphNormals=N.morphNormals,V.morphColors=N.morphColors,V.morphTargetsCount=N.morphTargetsCount,V.numClippingPlanes=N.numClippingPlanes,V.numIntersection=N.numClipIntersection,V.vertexAlphas=N.vertexAlphas,V.vertexTangents=N.vertexTangents,V.toneMapping=N.toneMapping}function ju(S,N,V,H,F){N.isScene!==!0&&(N=ot),b.resetTextureUnits();const ne=N.fog,fe=H.isMeshStandardMaterial?N.environment:null,ye=I===null?v.outputColorSpace:I.isXRRenderTarget===!0?I.texture.colorSpace:sr,be=(H.isMeshStandardMaterial?k:M).get(H.envMap||fe),Be=H.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,Ge=!!V.attributes.tangent&&(!!H.normalMap||H.anisotropy>0),Ie=!!V.morphAttributes.position,it=!!V.morphAttributes.normal,ct=!!V.morphAttributes.color;let wt=jn;H.toneMapped&&(I===null||I.isXRRenderTarget===!0)&&(wt=v.toneMapping);const Tt=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,rt=Tt!==void 0?Tt.length:0,De=me.get(H),Dt=p.state.lights;if(ae===!0&&(Ae===!0||S!==x)){const kt=S===x&&H.id===E;ie.setState(H,S,kt)}let lt=!1;H.version===De.__version?(De.needsLights&&De.lightsStateVersion!==Dt.state.version||De.outputColorSpace!==ye||F.isBatchedMesh&&De.batching===!1||!F.isBatchedMesh&&De.batching===!0||F.isBatchedMesh&&De.batchingColor===!0&&F.colorTexture===null||F.isBatchedMesh&&De.batchingColor===!1&&F.colorTexture!==null||F.isInstancedMesh&&De.instancing===!1||!F.isInstancedMesh&&De.instancing===!0||F.isSkinnedMesh&&De.skinning===!1||!F.isSkinnedMesh&&De.skinning===!0||F.isInstancedMesh&&De.instancingColor===!0&&F.instanceColor===null||F.isInstancedMesh&&De.instancingColor===!1&&F.instanceColor!==null||F.isInstancedMesh&&De.instancingMorph===!0&&F.morphTexture===null||F.isInstancedMesh&&De.instancingMorph===!1&&F.morphTexture!==null||De.envMap!==be||H.fog===!0&&De.fog!==ne||De.numClippingPlanes!==void 0&&(De.numClippingPlanes!==ie.numPlanes||De.numIntersection!==ie.numIntersection)||De.vertexAlphas!==Be||De.vertexTangents!==Ge||De.morphTargets!==Ie||De.morphNormals!==it||De.morphColors!==ct||De.toneMapping!==wt||De.morphTargetsCount!==rt)&&(lt=!0):(lt=!0,De.__version=H.version);let cn=De.currentProgram;lt===!0&&(cn=Vr(H,N,F));let yi=!1,$t=!1,hr=!1;const Mt=cn.getUniforms(),Qt=De.uniforms;if(oe.useProgram(cn.program)&&(yi=!0,$t=!0,hr=!0),H.id!==E&&(E=H.id,$t=!0),yi||x!==S){oe.buffers.depth.getReversed()?(ce.copy(S.projectionMatrix),Yd(ce),qd(ce),Mt.setValue(A,"projectionMatrix",ce)):Mt.setValue(A,"projectionMatrix",S.projectionMatrix),Mt.setValue(A,"viewMatrix",S.matrixWorldInverse);const Xt=Mt.map.cameraPosition;Xt!==void 0&&Xt.setValue(A,nt.setFromMatrixPosition(S.matrixWorld)),Me.logarithmicDepthBuffer&&Mt.setValue(A,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(H.isMeshPhongMaterial||H.isMeshToonMaterial||H.isMeshLambertMaterial||H.isMeshBasicMaterial||H.isMeshStandardMaterial||H.isShaderMaterial)&&Mt.setValue(A,"isOrthographic",S.isOrthographicCamera===!0),x!==S&&(x=S,$t=!0,hr=!0)}if(F.isSkinnedMesh){Mt.setOptional(A,F,"bindMatrix"),Mt.setOptional(A,F,"bindMatrixInverse");const kt=F.skeleton;kt&&(kt.boneTexture===null&&kt.computeBoneTexture(),Mt.setValue(A,"boneTexture",kt.boneTexture,b))}F.isBatchedMesh&&(Mt.setOptional(A,F,"batchingTexture"),Mt.setValue(A,"batchingTexture",F._matricesTexture,b),Mt.setOptional(A,F,"batchingIdTexture"),Mt.setValue(A,"batchingIdTexture",F._indirectTexture,b),Mt.setOptional(A,F,"batchingColorTexture"),F._colorsTexture!==null&&Mt.setValue(A,"batchingColorTexture",F._colorsTexture,b));const en=V.morphAttributes;if((en.position!==void 0||en.normal!==void 0||en.color!==void 0)&&ke.update(F,V,cn),($t||De.receiveShadow!==F.receiveShadow)&&(De.receiveShadow=F.receiveShadow,Mt.setValue(A,"receiveShadow",F.receiveShadow)),H.isMeshGouraudMaterial&&H.envMap!==null&&(Qt.envMap.value=be,Qt.flipEnvMap.value=be.isCubeTexture&&be.isRenderTargetTexture===!1?-1:1),H.isMeshStandardMaterial&&H.envMap===null&&N.environment!==null&&(Qt.envMapIntensity.value=N.environmentIntensity),$t&&(Mt.setValue(A,"toneMappingExposure",v.toneMappingExposure),De.needsLights&&Ju(Qt,hr),ne&&H.fog===!0&&he.refreshFogUniforms(Qt,ne),he.refreshMaterialUniforms(Qt,H,O,K,p.state.transmissionRenderTarget[S.id]),ws.upload(A,hc(De),Qt,b)),H.isShaderMaterial&&H.uniformsNeedUpdate===!0&&(ws.upload(A,hc(De),Qt,b),H.uniformsNeedUpdate=!1),H.isSpriteMaterial&&Mt.setValue(A,"center",F.center),Mt.setValue(A,"modelViewMatrix",F.modelViewMatrix),Mt.setValue(A,"normalMatrix",F.normalMatrix),Mt.setValue(A,"modelMatrix",F.matrixWorld),H.isShaderMaterial||H.isRawShaderMaterial){const kt=H.uniformsGroups;for(let Xt=0,Ks=kt.length;Xt<Ks;Xt++){const ni=kt[Xt];D.update(ni,cn),D.bind(ni,cn)}}return cn}function Ju(S,N){S.ambientLightColor.needsUpdate=N,S.lightProbe.needsUpdate=N,S.directionalLights.needsUpdate=N,S.directionalLightShadows.needsUpdate=N,S.pointLights.needsUpdate=N,S.pointLightShadows.needsUpdate=N,S.spotLights.needsUpdate=N,S.spotLightShadows.needsUpdate=N,S.rectAreaLights.needsUpdate=N,S.hemisphereLights.needsUpdate=N}function Qu(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return R},this.getActiveMipmapLevel=function(){return C},this.getRenderTarget=function(){return I},this.setRenderTargetTextures=function(S,N,V){me.get(S.texture).__webglTexture=N,me.get(S.depthTexture).__webglTexture=V;const H=me.get(S);H.__hasExternalTextures=!0,H.__autoAllocateDepthBuffer=V===void 0,H.__autoAllocateDepthBuffer||te.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),H.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(S,N){const V=me.get(S);V.__webglFramebuffer=N,V.__useDefaultFramebuffer=N===void 0};const eh=A.createFramebuffer();this.setRenderTarget=function(S,N=0,V=0){I=S,R=N,C=V;let H=!0,F=null,ne=!1,fe=!1;if(S){const be=me.get(S);if(be.__useDefaultFramebuffer!==void 0)oe.bindFramebuffer(A.FRAMEBUFFER,null),H=!1;else if(be.__webglFramebuffer===void 0)b.setupRenderTarget(S);else if(be.__hasExternalTextures)b.rebindTextures(S,me.get(S.texture).__webglTexture,me.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){const Ie=S.depthTexture;if(be.__boundDepthTexture!==Ie){if(Ie!==null&&me.has(Ie)&&(S.width!==Ie.image.width||S.height!==Ie.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");b.setupDepthRenderbuffer(S)}}const Be=S.texture;(Be.isData3DTexture||Be.isDataArrayTexture||Be.isCompressedArrayTexture)&&(fe=!0);const Ge=me.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Ge[N])?F=Ge[N][V]:F=Ge[N],ne=!0):S.samples>0&&b.useMultisampledRTT(S)===!1?F=me.get(S).__webglMultisampledFramebuffer:Array.isArray(Ge)?F=Ge[V]:F=Ge,P.copy(S.viewport),z.copy(S.scissor),U=S.scissorTest}else P.copy(ve).multiplyScalar(O).floor(),z.copy(Ue).multiplyScalar(O).floor(),U=Qe;if(V!==0&&(F=eh),oe.bindFramebuffer(A.FRAMEBUFFER,F)&&H&&oe.drawBuffers(S,F),oe.viewport(P),oe.scissor(z),oe.setScissorTest(U),ne){const be=me.get(S.texture);A.framebufferTexture2D(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_CUBE_MAP_POSITIVE_X+N,be.__webglTexture,V)}else if(fe){const be=me.get(S.texture),Be=N;A.framebufferTextureLayer(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0,be.__webglTexture,V,Be)}else if(S!==null&&V!==0){const be=me.get(S.texture);A.framebufferTexture2D(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,be.__webglTexture,V)}E=-1},this.readRenderTargetPixels=function(S,N,V,H,F,ne,fe){if(!(S&&S.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ye=me.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&fe!==void 0&&(ye=ye[fe]),ye){oe.bindFramebuffer(A.FRAMEBUFFER,ye);try{const be=S.texture,Be=be.format,Ge=be.type;if(!Me.textureFormatReadable(Be)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Me.textureTypeReadable(Ge)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}N>=0&&N<=S.width-H&&V>=0&&V<=S.height-F&&A.readPixels(N,V,H,F,We.convert(Be),We.convert(Ge),ne)}finally{const be=I!==null?me.get(I).__webglFramebuffer:null;oe.bindFramebuffer(A.FRAMEBUFFER,be)}}},this.readRenderTargetPixelsAsync=async function(S,N,V,H,F,ne,fe){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ye=me.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&fe!==void 0&&(ye=ye[fe]),ye){const be=S.texture,Be=be.format,Ge=be.type;if(!Me.textureFormatReadable(Be))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Me.textureTypeReadable(Ge))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(N>=0&&N<=S.width-H&&V>=0&&V<=S.height-F){oe.bindFramebuffer(A.FRAMEBUFFER,ye);const Ie=A.createBuffer();A.bindBuffer(A.PIXEL_PACK_BUFFER,Ie),A.bufferData(A.PIXEL_PACK_BUFFER,ne.byteLength,A.STREAM_READ),A.readPixels(N,V,H,F,We.convert(Be),We.convert(Ge),0);const it=I!==null?me.get(I).__webglFramebuffer:null;oe.bindFramebuffer(A.FRAMEBUFFER,it);const ct=A.fenceSync(A.SYNC_GPU_COMMANDS_COMPLETE,0);return A.flush(),await Xd(A,ct,4),A.bindBuffer(A.PIXEL_PACK_BUFFER,Ie),A.getBufferSubData(A.PIXEL_PACK_BUFFER,0,ne),A.deleteBuffer(Ie),A.deleteSync(ct),ne}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(S,N=null,V=0){S.isTexture!==!0&&(Vi("WebGLRenderer: copyFramebufferToTexture function signature has changed."),N=arguments[0]||null,S=arguments[1]);const H=Math.pow(2,-V),F=Math.floor(S.image.width*H),ne=Math.floor(S.image.height*H),fe=N!==null?N.x:0,ye=N!==null?N.y:0;b.setTexture2D(S,0),A.copyTexSubImage2D(A.TEXTURE_2D,V,0,0,fe,ye,F,ne),oe.unbindTexture()};const th=A.createFramebuffer(),nh=A.createFramebuffer();this.copyTextureToTexture=function(S,N,V=null,H=null,F=0,ne=null){S.isTexture!==!0&&(Vi("WebGLRenderer: copyTextureToTexture function signature has changed."),H=arguments[0]||null,S=arguments[1],N=arguments[2],ne=arguments[3]||0,V=null),ne===null&&(F!==0?(Vi("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ne=F,F=0):ne=0);let fe,ye,be,Be,Ge,Ie,it,ct,wt;const Tt=S.isCompressedTexture?S.mipmaps[ne]:S.image;if(V!==null)fe=V.max.x-V.min.x,ye=V.max.y-V.min.y,be=V.isBox3?V.max.z-V.min.z:1,Be=V.min.x,Ge=V.min.y,Ie=V.isBox3?V.min.z:0;else{const en=Math.pow(2,-F);fe=Math.floor(Tt.width*en),ye=Math.floor(Tt.height*en),S.isDataArrayTexture?be=Tt.depth:S.isData3DTexture?be=Math.floor(Tt.depth*en):be=1,Be=0,Ge=0,Ie=0}H!==null?(it=H.x,ct=H.y,wt=H.z):(it=0,ct=0,wt=0);const rt=We.convert(N.format),De=We.convert(N.type);let Dt;N.isData3DTexture?(b.setTexture3D(N,0),Dt=A.TEXTURE_3D):N.isDataArrayTexture||N.isCompressedArrayTexture?(b.setTexture2DArray(N,0),Dt=A.TEXTURE_2D_ARRAY):(b.setTexture2D(N,0),Dt=A.TEXTURE_2D),A.pixelStorei(A.UNPACK_FLIP_Y_WEBGL,N.flipY),A.pixelStorei(A.UNPACK_PREMULTIPLY_ALPHA_WEBGL,N.premultiplyAlpha),A.pixelStorei(A.UNPACK_ALIGNMENT,N.unpackAlignment);const lt=A.getParameter(A.UNPACK_ROW_LENGTH),cn=A.getParameter(A.UNPACK_IMAGE_HEIGHT),yi=A.getParameter(A.UNPACK_SKIP_PIXELS),$t=A.getParameter(A.UNPACK_SKIP_ROWS),hr=A.getParameter(A.UNPACK_SKIP_IMAGES);A.pixelStorei(A.UNPACK_ROW_LENGTH,Tt.width),A.pixelStorei(A.UNPACK_IMAGE_HEIGHT,Tt.height),A.pixelStorei(A.UNPACK_SKIP_PIXELS,Be),A.pixelStorei(A.UNPACK_SKIP_ROWS,Ge),A.pixelStorei(A.UNPACK_SKIP_IMAGES,Ie);const Mt=S.isDataArrayTexture||S.isData3DTexture,Qt=N.isDataArrayTexture||N.isData3DTexture;if(S.isDepthTexture){const en=me.get(S),kt=me.get(N),Xt=me.get(en.__renderTarget),Ks=me.get(kt.__renderTarget);oe.bindFramebuffer(A.READ_FRAMEBUFFER,Xt.__webglFramebuffer),oe.bindFramebuffer(A.DRAW_FRAMEBUFFER,Ks.__webglFramebuffer);for(let ni=0;ni<be;ni++)Mt&&(A.framebufferTextureLayer(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,me.get(S).__webglTexture,F,Ie+ni),A.framebufferTextureLayer(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,me.get(N).__webglTexture,ne,wt+ni)),A.blitFramebuffer(Be,Ge,fe,ye,it,ct,fe,ye,A.DEPTH_BUFFER_BIT,A.NEAREST);oe.bindFramebuffer(A.READ_FRAMEBUFFER,null),oe.bindFramebuffer(A.DRAW_FRAMEBUFFER,null)}else if(F!==0||S.isRenderTargetTexture||me.has(S)){const en=me.get(S),kt=me.get(N);oe.bindFramebuffer(A.READ_FRAMEBUFFER,th),oe.bindFramebuffer(A.DRAW_FRAMEBUFFER,nh);for(let Xt=0;Xt<be;Xt++)Mt?A.framebufferTextureLayer(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,en.__webglTexture,F,Ie+Xt):A.framebufferTexture2D(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,en.__webglTexture,F),Qt?A.framebufferTextureLayer(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,kt.__webglTexture,ne,wt+Xt):A.framebufferTexture2D(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,kt.__webglTexture,ne),F!==0?A.blitFramebuffer(Be,Ge,fe,ye,it,ct,fe,ye,A.COLOR_BUFFER_BIT,A.NEAREST):Qt?A.copyTexSubImage3D(Dt,ne,it,ct,wt+Xt,Be,Ge,fe,ye):A.copyTexSubImage2D(Dt,ne,it,ct,Be,Ge,fe,ye);oe.bindFramebuffer(A.READ_FRAMEBUFFER,null),oe.bindFramebuffer(A.DRAW_FRAMEBUFFER,null)}else Qt?S.isDataTexture||S.isData3DTexture?A.texSubImage3D(Dt,ne,it,ct,wt,fe,ye,be,rt,De,Tt.data):N.isCompressedArrayTexture?A.compressedTexSubImage3D(Dt,ne,it,ct,wt,fe,ye,be,rt,Tt.data):A.texSubImage3D(Dt,ne,it,ct,wt,fe,ye,be,rt,De,Tt):S.isDataTexture?A.texSubImage2D(A.TEXTURE_2D,ne,it,ct,fe,ye,rt,De,Tt.data):S.isCompressedTexture?A.compressedTexSubImage2D(A.TEXTURE_2D,ne,it,ct,Tt.width,Tt.height,rt,Tt.data):A.texSubImage2D(A.TEXTURE_2D,ne,it,ct,fe,ye,rt,De,Tt);A.pixelStorei(A.UNPACK_ROW_LENGTH,lt),A.pixelStorei(A.UNPACK_IMAGE_HEIGHT,cn),A.pixelStorei(A.UNPACK_SKIP_PIXELS,yi),A.pixelStorei(A.UNPACK_SKIP_ROWS,$t),A.pixelStorei(A.UNPACK_SKIP_IMAGES,hr),ne===0&&N.generateMipmaps&&A.generateMipmap(Dt),oe.unbindTexture()},this.copyTextureToTexture3D=function(S,N,V=null,H=null,F=0){return S.isTexture!==!0&&(Vi("WebGLRenderer: copyTextureToTexture3D function signature has changed."),V=arguments[0]||null,H=arguments[1]||null,S=arguments[2],N=arguments[3],F=arguments[4]||0),Vi('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(S,N,V,H,F)},this.initRenderTarget=function(S){me.get(S).__webglFramebuffer===void 0&&b.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?b.setTextureCube(S,0):S.isData3DTexture?b.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?b.setTexture2DArray(S,0):b.setTexture2D(S,0),oe.unbindTexture()},this.resetState=function(){R=0,C=0,I=null,oe.reset(),gt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return In}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorspace=st._getDrawingBufferColorSpace(e),t.unpackColorSpace=st._getUnpackColorSpace()}}function dt(i,e,t=0){return new w(i,t,-e)}function V0(i){return new w(i.x,i.z,-i.y)}function H0(i){return{x:i.x,y:-i.z,z:i.y}}const W0=856343,X0=2501427,Y0=65382,Dl=15130,zi=16750848,Ia=16724787,ys=52479,Nl=9147550;class dv{scene;staticGroup;zonesGroup;tracksGroup;eventMarkersGroup;trackMeshMap=new Map;materials;geometries;constructor(e=[],t=5e3,n=500){this.scene=new vu,this.scene.background=new tt(W0),this.staticGroup=new xt,this.zonesGroup=new xt,this.tracksGroup=new xt,this.eventMarkersGroup=new xt,this.scene.add(this.staticGroup),this.scene.add(this.zonesGroup),this.scene.add(this.tracksGroup),this.scene.add(this.eventMarkersGroup),this.geometries={octahedron:new Ys(22,0),box:new xi(26,26,26),cylinder:new or(18,18,14,8),selection:this.createSelectionGeometry(38),reticle:this.createReticleGeometry(45)},this.materials={threat:new _t({color:Ia,wireframe:!0}),civil:new _t({color:zi,wireframe:!0}),friend:new _t({color:ys,wireframe:!0}),bird:new _t({color:Nl,wireframe:!0}),stemClear:new Ke({color:Dl,transparent:!0,opacity:.6}),stemMasked:new Ke({color:zi,transparent:!0,opacity:.9}),stemSelected:new Ke({color:ys,transparent:!0,opacity:.9}),trailThreat:new Ke({color:Ia,transparent:!0,opacity:.75}),trailCivil:new Ke({color:zi,transparent:!0,opacity:.75}),trailFriend:new Ke({color:ys,transparent:!0,opacity:.75}),trailBird:new Ke({color:Nl,transparent:!0,opacity:.5}),selectionBox:new Ke({color:ys,linewidth:2}),maskingRing:new Ke({color:zi,linewidth:2}),engagementReticle:new Ke({color:Ia,linewidth:2})},this.buildStaticScene(t,n),this.buildZones(e)}createSelectionGeometry(e){const t=e/2,n=new Float32Array([-t,-t,-t,t,-t,-t,t,-t,-t,t,t,-t,t,t,-t,-t,t,-t,-t,t,-t,-t,-t,-t,-t,-t,t,t,-t,t,t,-t,t,t,t,t,t,t,t,-t,t,t,-t,t,t,-t,-t,t,-t,-t,-t,-t,-t,t,t,-t,-t,t,-t,t,t,t,-t,t,t,t,-t,t,-t,-t,t,t]),r=new Ze;return r.setAttribute("position",new Ht(n,3)),r}createReticleGeometry(e){const t=e/2,n=new Float32Array([-t,0,0,t,0,0,0,0,-t,0,0,t,-t,0,-t,t,0,-t,t,0,-t,t,0,t,t,0,t,-t,0,t,-t,0,t,-t,0,-t]),r=new Ze;return r.setAttribute("position",new Ht(n,3)),r}buildStaticScene(e,t){for(let o=1e3;o<=e;o+=1e3){const c=new Fr(o-1.5,o+1.5,96);c.rotateX(-Math.PI/2);const l=new _t({color:Dl,side:bt}),u=new mt(c,l);this.staticGroup.add(u)}const n=new Fr(t-2,t+2,64);n.rotateX(-Math.PI/2);const r=new _t({color:zi,side:bt});this.staticGroup.add(new mt(n,r));const s=new or(2,4,15,8);s.translate(0,7.5,0);const a=new _t({color:Y0,wireframe:!0});this.staticGroup.add(new mt(s,a))}buildZones(e){for(const t of e){if(t.polygon.length<3)continue;const n=new Ws,r=dt(t.polygon[0][0],t.polygon[0][1],0);n.moveTo(r.x,-r.z);for(let u=1;u<t.polygon.length;u++){const h=dt(t.polygon[u][0],t.polygon[u][1],0);n.lineTo(h.x,-h.z)}n.closePath();const s={depth:t.heightM,bevelEnabled:!1},a=new zr(n,s);a.rotateX(Math.PI/2);const o=t.type==="URBAN"?zi:X0,c=new _t({color:o,wireframe:!0,transparent:!0,opacity:.6}),l=new mt(a,c);this.zonesGroup.add(l)}}createLabelTexture(e,t,n,r,s){if(typeof document>"u")return new Nt;const a=document.createElement("canvas");a.width=256,a.height=72;const o=a.getContext("2d");if(o){o.fillStyle="rgba(13, 17, 23, 0.88)",o.fillRect(0,0,256,72),o.lineWidth=2,o.strokeStyle=s?"#FF9900":"#00FF66",o.strokeRect(0,0,256,72),o.font='bold 15px "JetBrains Mono", monospace',o.fillStyle="#FFFFFF",o.fillText(`TRK ${e}`,8,20),o.font='12px "JetBrains Mono", monospace',o.fillStyle="#00CCFF",o.fillText(`TRUE: ${t}`,8,38);const l=n&&n!=="UNKNOWN_EVIDENCE_INSUFFICIENT"&&n!==t;o.fillStyle=l?"#FF3333":n?"#00FF66":"#8B949E",o.fillText(`OP: ${n??"NONE"} (q=${r.toFixed(2)})`,8,56)}const c=new Mi(a);return c.needsUpdate=!0,c}update(e,t){const n=new Set;for(const r of e.tracks){const s=r.id;n.add(s);const a=r.trackNo===t,o=dt(r.truthPos.x,r.truthPos.y,r.truthPos.z);let c=this.trackMeshMap.get(s);if(!c){const l=new xt;let u=this.geometries.octahedron,h=this.materials.threat;r.trueClass==="CIVIL_UAS"?(u=this.geometries.box,h=this.materials.civil):r.trueClass==="FRIENDLY"?(u=this.geometries.cylinder,h=this.materials.friend):r.trueClass==="BIRD"&&(u=this.geometries.octahedron,h=this.materials.bird);const d=new mt(u,h),f=new Ze().setFromPoints([new w(0,0,0),new w(0,-r.truthPos.z,0)]),g=new Mn(f,this.materials.stemClear),_=new Ze().setFromPoints([new w(0,0,0)]),m=r.trueClass==="CIVIL_UAS"?this.materials.trailCivil:r.trueClass==="FRIENDLY"?this.materials.trailFriend:r.trueClass==="BIRD"?this.materials.trailBird:this.materials.trailThreat,p=new Mn(_,m),T=new sn({map:this.createLabelTexture(r.trackNo??"TRK",r.trueClass,r.traineeLabel,r.q,r.isMasked),transparent:!0}),y=new mn(T);y.scale.set(120,36,1),y.position.set(0,35,0),l.add(d),l.add(g),l.add(p),l.add(y),this.tracksGroup.add(l),c={group:l,droneMesh:d,altitudeStem:g,trailLine:p,labelSprite:y,selectionBox:null},this.trackMeshMap.set(s,c)}if(c.group.position.copy(o),c.altitudeStem.geometry.dispose(),c.altitudeStem.geometry=new Ze().setFromPoints([new w(0,0,0),new w(0,-o.y,0)]),c.altitudeStem.material=a?this.materials.stemSelected:r.isMasked?this.materials.stemMasked:this.materials.stemClear,r.trail.length>1){const l=r.trail.map(u=>{const h=dt(u.x,u.y,u.z);return new w(h.x-o.x,h.y-o.y,h.z-o.z)});c.trailLine.geometry.dispose(),c.trailLine.geometry=new Ze().setFromPoints(l),c.trailLine.visible=!0}else c.trailLine.visible=!1;a&&!c.selectionBox?(c.selectionBox=new Gt(this.geometries.selection,this.materials.selectionBox),c.group.add(c.selectionBox)):!a&&c.selectionBox&&(c.group.remove(c.selectionBox),c.selectionBox=null)}for(const[r,s]of this.trackMeshMap)n.has(r)||(s.altitudeStem.geometry.dispose(),s.trailLine.geometry.dispose(),s.labelSprite.material.dispose(),this.tracksGroup.remove(s.group),this.trackMeshMap.delete(r));this.updateEventMarkers(e)}updateEventMarkers(e){for(;this.eventMarkersGroup.children.length>0;){const t=this.eventMarkersGroup.children[0];this.eventMarkersGroup.remove(t),(t instanceof mt||t instanceof Mn)&&t.geometry.dispose()}if(e.activeEngagement&&e.activeEngagement.pos){const t=dt(e.activeEngagement.pos.x,e.activeEngagement.pos.y,e.activeEngagement.pos.z),n=new Gt(this.geometries.reticle,this.materials.engagementReticle);n.position.copy(t),this.eventMarkersGroup.add(n)}}dispose(){for(const[,e]of this.trackMeshMap)e.altitudeStem.geometry.dispose(),e.trailLine.geometry.dispose(),e.labelSprite.material.dispose(),this.tracksGroup.remove(e.group);for(this.trackMeshMap.clear();this.staticGroup.children.length>0;){const e=this.staticGroup.children[0];this.staticGroup.remove(e),e instanceof mt&&(e.geometry.dispose(),Array.isArray(e.material)?e.material.forEach(t=>t.dispose()):e.material.dispose())}for(;this.zonesGroup.children.length>0;){const e=this.zonesGroup.children[0];this.zonesGroup.remove(e),e instanceof mt&&(e.geometry.dispose(),Array.isArray(e.material)?e.material.forEach(t=>t.dispose()):e.material.dispose())}Object.values(this.materials).forEach(e=>e.dispose()),Object.values(this.geometries).forEach(e=>e.dispose())}}function On(i,e,t){return!i||e===void 0||!t?!1:i.some(n=>n.type===t&&e>=n.tStartMs&&e<n.tEndMs)}function wr(i=Pr,e=1,t=.9,n=vt.thresholds.radarMaxRangeM){if(i<=0||e<=0||t<=0||t>=1)return 0;const r=t===.9?1:-Math.log(1-t)/2.303;if(r<=0)return 0;const s=i/Pr,a=Xl*Math.pow(s*e/r,.25);return Math.max(0,Math.min(a,n))}function q0(i){const e=i.maxRangeM??vt.thresholds.radarMaxRangeM,t=i.rcsRefM2??Pr,n=.9;let r=1,s="NOMINAL";const a=i.sensorHealth==="OUT"||On(i.chaosList,i.tMs,"RADAR_DROPOUT"),o=i.sensorHealth==="DEG"||On(i.chaosList,i.tMs,"RAIN");a?(r=0,s="DROPOUT"):o&&(r=.7,s="DEGRADED");const c=wr(t,r,n,e),l=`RADAR [HORIZONTAL-RANGE MODEL] R90: ${Math.round(c)}m (RCS: ${t}m² | Pd: 90%) | MAX: ${e}m | ${s}`;return{maxRangeM:e,r90RadiusM:c,rcsRefM2:t,pdThreshold:n,aEnv:r,status:s,isAltitudeIndependentProjection:!0,label:l}}function Z0(i){const e=i.isNight?vt.thresholds.eoirMaxRangeNightM:vt.thresholds.eoirMaxRangeDayM,t=i.sensorHealth==="DEG"||On(i.chaosList,i.tMs,"FOG"),n=t?vt.chaos.FOG.eoirRangeMultiplier:1,r=e*n,s=t?"FOG_DEGRADED":i.isNight?"NIGHT_NOMINAL":"DAY_NOMINAL",a=`EO/IR 30° FOV [RENDER ONLY VERTICAL CAP] | ${Math.round(r)}m | ${s}`;return{boresightAzimuthDeg:(i.azimuthDeg%360+360)%360,fovDeg:30,effectiveRangeM:r,status:s,elevationModelled:!1,label:a}}function $0(i){const e=vt.thresholds.rfMaxRangeM,t=i.sensorHealth==="OUT"||On(i.chaosList,i.tMs,"JAMMING"),n=t?"JAMMED":"NOMINAL",r=t?`RF PASSIVE DETECTION | ${e}m | JAMMED [DENIED]`:`RF PASSIVE DETECTION | ${e}m | NOMINAL`;return{maxRangeM:e,status:n,isFunctional:!t,label:r}}function K0(i=64){const e=[];for(let t=0;t<=i;t++){const n=t/i*Math.PI*2;e.push(new w(Math.cos(n),0,Math.sin(n)))}return new Ze().setFromPoints(e)}function j0(i=16){const e=au.degToRad(30),t=e/2,n=[],r=[],s=[],a=[];for(let h=0;h<=i;h++){const d=-t+h/i*e,f=Math.sin(d),g=-Math.cos(d);s.push(new w(f,0,g)),a.push(new w(f,1,g))}const o=new w(0,0,0),c=new w(0,1,0);for(let h=0;h<i;h++)n.push(o.x,o.y,o.z,s[h].x,s[h].y,s[h].z,s[h+1].x,s[h+1].y,s[h+1].z);for(let h=0;h<i;h++)n.push(c.x,c.y,c.z,a[h+1].x,a[h+1].y,a[h+1].z,a[h].x,a[h].y,a[h].z);n.push(o.x,o.y,o.z,s[0].x,s[0].y,s[0].z,a[0].x,a[0].y,a[0].z,o.x,o.y,o.z,a[0].x,a[0].y,a[0].z,c.x,c.y,c.z),n.push(o.x,o.y,o.z,a[i].x,a[i].y,a[i].z,s[i].x,s[i].y,s[i].z,o.x,o.y,o.z,c.x,c.y,c.z,a[i].x,a[i].y,a[i].z);for(let h=0;h<i;h++)n.push(s[h].x,s[h].y,s[h].z,s[h+1].x,s[h+1].y,s[h+1].z,a[h].x,a[h].y,a[h].z,s[h+1].x,s[h+1].y,s[h+1].z,a[h+1].x,a[h+1].y,a[h+1].z,a[h].x,a[h].y,a[h].z);const l=new Ze;l.setAttribute("position",new ft(n,3)),l.computeVertexNormals(),r.push(o,s[0],o,s[i],c,a[0],c,a[i],o,c,s[0],a[0],s[i],a[i]);for(let h=0;h<i;h++)r.push(s[h],s[h+1]),r.push(a[h],a[h+1]);const u=new Ze().setFromPoints(r);return{meshGeom:l,wireGeom:u}}function Da(i,e){if(typeof document>"u"){const o=new sn({transparent:!0,depthTest:!1}),c=new mn(o);return c.scale.set(160,24,1),c}const t=document.createElement("canvas");t.width=256,t.height=36;const n=t.getContext("2d");n&&(n.fillStyle="rgba(13, 17, 23, 0.85)",n.fillRect(0,0,256,36),n.strokeStyle=e,n.lineWidth=1.5,n.strokeRect(1,1,254,34),n.font="bold 12px monospace",n.fillStyle=e,n.textAlign="center",n.textBaseline="middle",n.fillText(i,128,18));const r=new Mi(t);r.minFilter=qt;const s=new sn({map:r,transparent:!0,depthTest:!1}),a=new mn(s);return a.scale.set(160,24,1),a}function Na(i,e,t){if(typeof document>"u")return;const n=i.material.map;if(!n||!n.image)return;const r=n.image,s=r.getContext("2d");s&&(s.clearRect(0,0,r.width,r.height),s.fillStyle="rgba(13, 17, 23, 0.85)",s.fillRect(0,0,r.width,r.height),s.strokeStyle=t,s.lineWidth=1.5,s.strokeRect(1,1,r.width-2,r.height-2),s.font="bold 12px monospace",s.fillStyle=t,s.textAlign="center",s.textBaseline="middle",s.fillText(e,r.width/2,r.height/2),n.needsUpdate=!0)}class Nu{group;radarGroup;radarOuterCylinder;radarOuterSurface;radarR90Group;radarR90Cylinder;radarR90Surface;radarLabelSprite;lastRadarLabel="";eoirGroup;eoirWedgeMesh;eoirWedgeWire;eoirBoresightRay;eoirLabelSprite;lastEoirLabel="";rfGroup;rfCylinderWire;rfSurface;rfLabelSprite;lastRfLabel="";unitCircleGeom;unitCylinderGeom;unitCylinderEdges;wedgeGeom;matPhosphorDim;matPhosphorWire;matPhosphorSurface;matAmberWire;matAmberSurface;matRedWire;matCyanSurface;matCyanWire;matYellowWire;matYellowSurface;constructor(){this.group=new xt,this.unitCircleGeom=K0(64),this.unitCylinderGeom=new or(1,1,1,64,1,!0),this.unitCylinderEdges=new ic(this.unitCylinderGeom),this.wedgeGeom=j0(16),this.matPhosphorDim=new Ke({color:65382,transparent:!0,opacity:.25}),this.matPhosphorWire=new Ke({color:65382,transparent:!0,opacity:.6}),this.matPhosphorSurface=new _t({color:65382,transparent:!0,opacity:.04,side:bt,depthWrite:!1}),this.matAmberWire=new Ke({color:16750848,transparent:!0,opacity:.7}),this.matAmberSurface=new _t({color:16750848,transparent:!0,opacity:.05,side:bt,depthWrite:!1}),this.matRedWire=new Ke({color:16724787,transparent:!0,opacity:.8}),this.matCyanSurface=new _t({color:58879,transparent:!0,opacity:.08,side:bt,depthWrite:!1}),this.matCyanWire=new Ke({color:58879,transparent:!0,opacity:.6}),this.matYellowWire=new Ke({color:16763904,transparent:!0,opacity:.4}),this.matYellowSurface=new _t({color:16763904,transparent:!0,opacity:.03,side:bt,depthWrite:!1}),this.radarGroup=new xt;const e=vt.thresholds.radarMaxRangeM,t=500;this.radarOuterCylinder=new Gt(this.unitCylinderEdges,this.matPhosphorDim),this.radarOuterCylinder.scale.set(e,t,e),this.radarOuterCylinder.position.set(0,t/2,0),this.radarGroup.add(this.radarOuterCylinder),this.radarOuterSurface=new mt(this.unitCylinderGeom,this.matPhosphorSurface),this.radarOuterSurface.scale.set(e,t,e),this.radarOuterSurface.position.set(0,t/2,0),this.radarGroup.add(this.radarOuterSurface),this.radarR90Group=new xt,this.radarR90Cylinder=new Gt(this.unitCylinderEdges,this.matPhosphorWire),this.radarR90Surface=new mt(this.unitCylinderGeom,this.matPhosphorSurface),this.radarR90Group.add(this.radarR90Cylinder),this.radarR90Group.add(this.radarR90Surface),this.radarGroup.add(this.radarR90Group),this.radarLabelSprite=Da("RADAR [HORIZONTAL-RANGE MODEL]","#00FF66"),this.radarLabelSprite.position.set(0,t+30,-e*.7),this.radarGroup.add(this.radarLabelSprite),this.group.add(this.radarGroup),this.eoirGroup=new xt,this.eoirWedgeMesh=new mt(this.wedgeGeom.meshGeom,this.matCyanSurface),this.eoirWedgeWire=new Gt(this.wedgeGeom.wireGeom,this.matCyanWire);const n=new Ze().setFromPoints([new w(0,0,0),new w(0,0,-1)]);this.eoirBoresightRay=new Mn(n,this.matCyanWire),this.eoirGroup.add(this.eoirWedgeMesh),this.eoirGroup.add(this.eoirWedgeWire),this.eoirGroup.add(this.eoirBoresightRay),this.eoirLabelSprite=Da("EO/IR 30° FOV [RENDER ONLY VERTICAL CAP]","#00E5FF"),this.eoirLabelSprite.position.set(0,260,-1500),this.eoirGroup.add(this.eoirLabelSprite),this.group.add(this.eoirGroup),this.rfGroup=new xt;const r=vt.thresholds.rfMaxRangeM,s=400;this.rfCylinderWire=new Gt(this.unitCylinderEdges,this.matYellowWire),this.rfCylinderWire.scale.set(r,s,r),this.rfCylinderWire.position.set(0,s/2,0),this.rfGroup.add(this.rfCylinderWire),this.rfSurface=new mt(this.unitCylinderGeom,this.matYellowSurface),this.rfSurface.scale.set(r,s,r),this.rfSurface.position.set(0,s/2,0),this.rfGroup.add(this.rfSurface),this.rfLabelSprite=Da("RF PASSIVE DETECTION | 4000m","#FFCC00"),this.rfLabelSprite.position.set(0,s+30,r*.7),this.rfGroup.add(this.rfLabelSprite),this.group.add(this.rfGroup)}update(e){if(!e.visible){this.group.visible=!1;return}this.group.visible=!0;const{radar:t,eoir:n,rf:r,activeSensor:s}=e,a=500;if(t.r90RadiusM>0?(this.radarR90Group.visible=!0,this.radarR90Group.scale.set(t.r90RadiusM,a,t.r90RadiusM),this.radarR90Group.position.set(0,a/2,0),t.status==="DEGRADED"?(this.radarR90Cylinder.material=this.matAmberWire,this.radarR90Surface.material=this.matAmberSurface):(this.radarR90Cylinder.material=this.matPhosphorWire,this.radarR90Surface.material=this.matPhosphorSurface)):this.radarR90Group.visible=!1,t.status==="DROPOUT"?this.radarOuterCylinder.material=this.matRedWire:this.radarOuterCylinder.material=this.matPhosphorDim,t.label!==this.lastRadarLabel){this.lastRadarLabel=t.label;const c=t.status==="DROPOUT"?"#FF3333":t.status==="DEGRADED"?"#FF9900":"#00FF66";Na(this.radarLabelSprite,t.label,c)}const o=250;if(this.eoirGroup.rotation.y=-au.degToRad(n.boresightAzimuthDeg),this.eoirWedgeMesh.scale.set(n.effectiveRangeM,o,n.effectiveRangeM),this.eoirWedgeWire.scale.set(n.effectiveRangeM,o,n.effectiveRangeM),this.eoirBoresightRay.scale.set(1,1,n.effectiveRangeM),this.eoirLabelSprite.position.set(0,o+25,-Math.min(n.effectiveRangeM*.8,2e3)),n.status==="FOG_DEGRADED"?(this.eoirWedgeWire.material=this.matAmberWire,this.eoirWedgeMesh.material=this.matAmberSurface):(this.eoirWedgeWire.material=this.matCyanWire,this.eoirWedgeMesh.material=this.matCyanSurface),n.label!==this.lastEoirLabel){this.lastEoirLabel=n.label;const c=n.status==="FOG_DEGRADED"?"#FF9900":"#00E5FF";Na(this.eoirLabelSprite,n.label,c)}if(r.isFunctional?(this.rfCylinderWire.material=this.matYellowWire,this.rfSurface.material=this.matYellowSurface):(this.rfCylinderWire.material=this.matRedWire,this.rfSurface.material=this.matAmberSurface),r.label!==this.lastRfLabel){this.lastRfLabel=r.label;const c=r.isFunctional?"#FFCC00":"#FF3333";Na(this.rfLabelSprite,r.label,c)}this.radarGroup.visible=s==="RADAR"||s===void 0,this.eoirGroup.visible=s==="EOIR"||s===void 0,this.rfGroup.visible=s==="RF"||s===void 0}setSensorFilter(e){e==="ALL"?(this.radarGroup.visible=!0,this.eoirGroup.visible=!0,this.rfGroup.visible=!0):(this.radarGroup.visible=e==="RADAR",this.eoirGroup.visible=e==="EOIR",this.rfGroup.visible=e==="RF")}dispose(){this.unitCircleGeom.dispose(),this.unitCylinderGeom.dispose(),this.unitCylinderEdges.dispose(),this.wedgeGeom.meshGeom.dispose(),this.wedgeGeom.wireGeom.dispose(),this.matPhosphorDim.dispose(),this.matPhosphorWire.dispose(),this.matPhosphorSurface.dispose(),this.matAmberWire.dispose(),this.matAmberSurface.dispose(),this.matRedWire.dispose(),this.matCyanSurface.dispose(),this.matCyanWire.dispose(),this.matYellowWire.dispose(),this.matYellowSurface.dispose(),this.radarLabelSprite.material.map&&this.radarLabelSprite.material.map.dispose(),this.radarLabelSprite.material.dispose(),this.eoirLabelSprite.material.map&&this.eoirLabelSprite.material.map.dispose(),this.eoirLabelSprite.material.dispose(),this.rfLabelSprite.material.map&&this.rfLabelSprite.material.map.dispose(),this.rfLabelSprite.material.dispose(),this.group.clear()}}function Uu(i,e){const t=i*Math.PI/180;return{x:e*Math.sin(t),y:e*Math.cos(t)}}function Fu(i,e,t=[],n=vt.thresholds.antennaHeightM||15){const r=Math.hypot(i,e);if(r<1||!Wo({x:i,y:e,z:0},t).isMasked)return 0;let a=0;for(const o of t){if(o.polygon.length<3)continue;const c=Ho(i,e,o.polygon);let l=1/0;for(let u=0;u<o.polygon.length;u++){const h=o.polygon[u],d=o.polygon[(u+1)%o.polygon.length],f=zs(i,e,h,d);f!==null&&f<l&&(l=f)}if(c){let u=o.heightM;if(l<1/0&&l<=r&&r-l<=o.shadowM&&l>0){const d=n+r/l*(o.heightM-n);u=Math.max(u,d)}a=Math.max(a,u)}else if(l<1/0&&l<=r&&r-l<=o.shadowM&&l>0){const h=n+r/l*(o.heightM-n);h>0&&(a=Math.max(a,h))}}return Math.max(0,a)}function J0(i,e=5e3,t=[],n=50,r=vt.thresholds.antennaHeightM||15){const s=(i%360+360)%360,a=[],o=[],c=s*Math.PI/180,l=Math.sin(c),u=Math.cos(c);for(const d of t){if(d.polygon.length<3)continue;const f=[],g=e*l,_=e*u;for(let m=0;m<d.polygon.length;m++){const p=d.polygon[m],T=d.polygon[(m+1)%d.polygon.length],y=zs(g,_,p,T);y!==null&&y<=e&&f.push(y)}if(f.sort((m,p)=>m-p),f.length>=2){const m=f[0],p=f[f.length-1];o.push({zoneId:d.id,dNearM:m,dFarM:p,heightM:d.heightM,shadowM:d.shadowM,shadowEndM:Math.min(e,m+d.shadowM)})}else if(f.length===1){const m=f[0];o.push({zoneId:d.id,dNearM:m,dFarM:Math.min(e,m+100),heightM:d.heightM,shadowM:d.shadowM,shadowEndM:Math.min(e,m+d.shadowM)})}}for(let d=0;d<=e;d+=n){const f=Uu(s,d),g=Fu(f.x,f.y,t,r),_=Wo({x:f.x,y:f.y,z:0},t);let m=!1,p=0,T;for(const y of t)if(Ho(f.x,f.y,y.polygon)){m=!0,p=y.heightM,T=y.id;break}a.push({rangeM:d,x:f.x,y:f.y,isInsideZone:m,zoneHeightM:p,zoneId:T,shadowCeilingM:g,isMaskedAtGround:_.isMasked})}return{bearingDeg:s,maxRangeM:e,antennaHeightM:r,blocks:o,samples:a,verticalExaggerationFactor:12.2,altitudeBands:{lowCeilingM:40,midCeilingM:100,highCeilingM:160}}}function Ou(i=vt.thresholds.radarMaxRangeM||5e3){const e=Math.round(wr(.005,1,.9,i)),t=Math.round(wr(Pr,1,.9,i)),n=Math.round(wr(.05,1,.9,i));return[{rcsM2:.005,radiusM:e,label:`REF-RCS 0.005m² · R90: ${e}m`,isGuaranteedLimit:!1,description:"Probabilistic SNR R90 Shell for Micro Drone (quadcopter). Detection is not guaranteed."},{rcsM2:.01,radiusM:t,label:`REF-RCS 0.010m² · R90: ${t}m`,isGuaranteedLimit:!1,description:"Nominal Reference RCS Benchmark (mini drone). Detection is not guaranteed."},{rcsM2:.05,radiusM:n,label:`REF-RCS 0.050m² · R90: ${n}m`,isGuaranteedLimit:!1,description:"Group 2 Medium Drone constant-SNR boundary."},{rcsM2:1,radiusM:i,label:`RADAR HORIZON CUTOFF · ${i}m`,isGuaranteedLimit:!0,description:"Maximum horizontal instrumented processing limit. Hard simulation horizon."}]}function ku(i,e,t,n){const r=["RF_SOFTKILL","LASER","GUN","INTERCEPTOR","MISSILE"],s=e?.RF==="OUT"||On(t,n,"JAMMING"),a=e?.EOIR==="DEG"||On(t,n,"FOG");return r.map(o=>{const c=vt.effectors[o],l=Gs(o);let u=!0,h="READY";return o==="RF_SOFTKILL"&&s?(u=!1,h="BLOCKED (RF JAMMED)"):o==="LASER"&&a&&(h="DEGRADED (FOG: 50% Pk)"),{id:o,name:c.name,tier:c.tier,costInr:c.costInr,envelopeMinM:l.envelopeMinM,envelopeMaxM:l.envelopeMaxM,plateauMinM:l.plateauMinM,plateauMaxM:l.plateauMaxM,rOptM:l.rOptM,isArmed:o===i,isFunctional:u,statusLabel:h}})}function Bu(i,e,t,n,r){const s=Math.hypot(e.pos.x,e.pos.y),a=vt.effectors[i],{envelopeMinM:o,envelopeMaxM:c,plateauMinM:l,plateauMaxM:u}=Gs(i),h=t?.RF==="OUT"||On(n,r,"JAMMING"),d=t?.EOIR==="DEG"||On(n,r,"FOG"),f=e.q<vt.thresholds.qMin,g=s<o||s>c,_=i==="RF_SOFTKILL"&&h,m=f||g||_,p=f?`Q < ${vt.thresholds.qMin}`:g?s<o?`BELOW MIN (${Math.round(s)}m < ${o}m)`:`BEYOND MAX (${Math.round(s)}m > ${c}m)`:_?"RF JAMMED":null,T=s>=l&&s<=u,y=Xo(s,i),v=Bh(i,s,{droneType:"FPV_ATTACK",emitsRf:!0},{isFogActive:d,isJammingActive:h});let L=`${e.trackNo} | ${Math.round(s)}m | ${a.name}`;return m?L+=` [BLOCKED: ${p}]`:T?L+=` [OPTIMAL: Pk ${(v*100).toFixed(0)}%]`:L+=` [MARGINAL: Pk ${(v*100).toFixed(0)}% (g=${y.toFixed(2)})]`,{trackNo:e.trackNo,rangeM:s,isOutOfEnvelope:g,isInPlateau:T,isHardBlocked:m,hardBlockReason:p,effectivePk:v,attenuationG:y,label:L}}function Q0(i,e,t=64){const n=new Fr(i,e,t);return n.rotateX(-Math.PI/2),n}function Mr(i,e=64){const t=[];for(let n=0;n<=e;n++){const r=n/e*Math.PI*2;t.push(new w(Math.cos(r)*i,0,Math.sin(r)*i))}return new Ze().setFromPoints(t)}function Ua(i,e){if(typeof document>"u"){const o=new sn({transparent:!0,depthTest:!1}),c=new mn(o);return c.scale.set(160,24,1),c}const t=document.createElement("canvas");t.width=256,t.height=36;const n=t.getContext("2d");n&&(n.fillStyle="rgba(13, 17, 23, 0.85)",n.fillRect(0,0,256,36),n.strokeStyle=e,n.lineWidth=1.5,n.strokeRect(1,1,254,34),n.font="bold 12px monospace",n.fillStyle=e,n.textAlign="center",n.textBaseline="middle",n.fillText(i,128,18));const r=new Mi(t);r.minFilter=qt;const s=new sn({map:r,transparent:!0,depthTest:!1}),a=new mn(s);return a.scale.set(160,24,1),a}function Ul(i,e,t){if(typeof document>"u")return;const n=i.material.map;if(!n||!n.image)return;const r=n.image,s=r.getContext("2d");s&&(s.clearRect(0,0,r.width,r.height),s.fillStyle="rgba(13, 17, 23, 0.85)",s.fillRect(0,0,r.width,r.height),s.strokeStyle=t,s.lineWidth=1.5,s.strokeRect(1,1,r.width-2,r.height-2),s.font="bold 12px monospace",s.fillStyle=t,s.textAlign="center",s.textBaseline="middle",s.fillText(e,r.width/2,r.height/2),n.needsUpdate=!0)}class zu{group;effectorRecords=new Map;pnrGroup;pnrLoop;pnrFence;pnrLabelSprite;targetCueSprite;lastTargetCueLabel="";matT1Wire;matT1Surface;matT2Wire;matT2Surface;matT3Wire;matT3Surface;matPlateauArmed;matPnrWire;matBlockedWire;constructor(){this.group=new xt,this.matT1Wire=new Ke({color:58879,transparent:!0,opacity:.6}),this.matT1Surface=new _t({color:58879,transparent:!0,opacity:.08,side:bt,depthWrite:!1}),this.matT2Wire=new Ke({color:16750848,transparent:!0,opacity:.7}),this.matT2Surface=new _t({color:16750848,transparent:!0,opacity:.08,side:bt,depthWrite:!1}),this.matT3Wire=new Ke({color:16724787,transparent:!0,opacity:.8}),this.matT3Surface=new _t({color:16724787,transparent:!0,opacity:.08,side:bt,depthWrite:!1}),this.matPlateauArmed=new _t({color:65382,transparent:!0,opacity:.16,side:bt,depthWrite:!1}),this.matPnrWire=new Ke({color:16750848,transparent:!0,opacity:.9}),this.matBlockedWire=new Ke({color:16724787,transparent:!0,opacity:.6}),["RF_SOFTKILL","LASER","GUN","INTERCEPTOR","MISSILE"].forEach(o=>{const c=vt.effectors[o],l=Gs(o),u=new xt,h=c.tier==="T3_HEAVY"?this.matT3Wire:c.tier==="T2_KINETIC"?this.matT2Wire:this.matT1Wire,d=c.tier==="T3_HEAVY"?this.matT3Surface:c.tier==="T2_KINETIC"?this.matT2Surface:this.matT1Surface,f=Q0(l.plateauMinM,l.plateauMaxM,64),g=new mt(f,d);g.position.y=1,u.add(g);const _=Mr(l.envelopeMinM,64),m=Mr(l.envelopeMaxM,64),p=Mr(l.plateauMinM,64),T=Mr(l.plateauMaxM,64),y=new Zn(_,h),v=new Zn(m,h),L=new Zn(p,h),R=new Zn(T,h);u.add(y),u.add(v),u.add(L),u.add(R);const C=150,I=[new w(0,0,-l.envelopeMaxM),new w(0,C,-l.envelopeMaxM),new w(l.envelopeMaxM,0,0),new w(l.envelopeMaxM,C,0),new w(0,0,l.envelopeMaxM),new w(0,C,l.envelopeMaxM),new w(-l.envelopeMaxM,0,0),new w(-l.envelopeMaxM,C,0)],E=new Ze().setFromPoints(I),x=new Gt(E,h);u.add(x);const P=c.tier==="T3_HEAVY"?"#FF3333":c.tier==="T2_KINETIC"?"#FF9900":"#00E5FF",z=`[${o}] ${(c.envelopeMinM/1e3).toFixed(1)}-${(c.envelopeMaxM/1e3).toFixed(1)}km | ${c.tier}`,U=Ua(z,P);U.position.set(0,C+25,-l.rOptM),u.add(U),this.effectorRecords.set(o,{group:u,plateauMesh:g,minLoop:y,maxLoop:v,plateauMinLoop:L,plateauMaxLoop:R,struts:x,labelSprite:U,lastLabel:z}),this.group.add(u)}),this.pnrGroup=new xt;const t=vt.thresholds.rMinM,n=Mr(t,64);this.pnrLoop=new Zn(n,this.matPnrWire),this.pnrLoop.position.y=1,this.pnrGroup.add(this.pnrLoop);const r=80,s=[];for(let o=0;o<16;o++){const c=o/16*Math.PI*2,l=Math.cos(c)*t,u=Math.sin(c)*t;s.push(new w(l,0,u),new w(l,r,u))}const a=new Ze().setFromPoints(s);this.pnrFence=new Gt(a,this.matPnrWire),this.pnrGroup.add(this.pnrFence),this.pnrLabelSprite=Ua("PNR PERIMETER: 500m [POINT OF NO RETURN]","#FF9900"),this.pnrLabelSprite.position.set(0,r+20,-t),this.pnrGroup.add(this.pnrLabelSprite),this.group.add(this.pnrGroup),this.targetCueSprite=Ua("","#00FF66"),this.targetCueSprite.visible=!1,this.group.add(this.targetCueSprite)}update(e){if(e.visible===!1){this.group.visible=!1;return}if(this.group.visible=!0,ku(e.activeEffector,e.sensorHealth,e.chaosList,e.tMs).forEach(n=>{const r=this.effectorRecords.get(n.id);if(!r)return;const s=n.isArmed;if(r.group.visible=s,s){n.isFunctional?r.plateauMesh.material=this.matPlateauArmed:(r.minLoop.material=this.matBlockedWire,r.maxLoop.material=this.matBlockedWire,r.plateauMinLoop.material=this.matBlockedWire,r.plateauMaxLoop.material=this.matBlockedWire,r.struts.material=this.matBlockedWire);const a=`[${n.id}] ${(n.envelopeMinM/1e3).toFixed(1)}-${(n.envelopeMaxM/1e3).toFixed(1)}km | ${n.tier} | ${n.statusLabel}`;if(a!==r.lastLabel){r.lastLabel=a;const o=n.isFunctional?n.tier==="T3_HEAVY"?"#FF3333":"#FF9900":"#FF3333";Ul(r.labelSprite,a,o)}}}),e.selectedTrack){const n=Bu(e.activeEffector,e.selectedTrack,e.sensorHealth,e.chaosList,e.tMs);if(this.targetCueSprite.visible=!0,this.targetCueSprite.position.set(e.selectedTrack.pos.x,e.selectedTrack.pos.z+55,-e.selectedTrack.pos.y),n.label!==this.lastTargetCueLabel){this.lastTargetCueLabel=n.label;const r=n.isHardBlocked?"#FF3333":n.isInPlateau?"#00FF66":"#FF9900";Ul(this.targetCueSprite,n.label,r)}}else this.targetCueSprite.visible=!1}dispose(){this.effectorRecords.forEach(e=>{e.plateauMesh.geometry.dispose(),e.minLoop.geometry.dispose(),e.maxLoop.geometry.dispose(),e.plateauMinLoop.geometry.dispose(),e.plateauMaxLoop.geometry.dispose(),e.struts.geometry.dispose(),e.labelSprite.material.map&&e.labelSprite.material.map.dispose(),e.labelSprite.material.dispose(),e.group.clear()}),this.effectorRecords.clear(),this.pnrLoop.geometry.dispose(),this.pnrFence.geometry.dispose(),this.pnrLabelSprite.material.map&&this.pnrLabelSprite.material.map.dispose(),this.pnrLabelSprite.material.dispose(),this.pnrGroup.clear(),this.targetCueSprite.material.map&&this.targetCueSprite.material.map.dispose(),this.targetCueSprite.material.dispose(),this.matT1Wire.dispose(),this.matT1Surface.dispose(),this.matT2Wire.dispose(),this.matT2Surface.dispose(),this.matT3Wire.dispose(),this.matT3Surface.dispose(),this.matPlateauArmed.dispose(),this.matPnrWire.dispose(),this.matBlockedWire.dispose(),this.group.clear()}}function Fa(i){const e=i*180/Math.PI;return`${e>=0?"+":""}${e.toFixed(1)}`}function Gu(i,e=[],t=vt.thresholds.antennaHeightM||15){const n={x:0,y:0,z:t};if(!i.pos||Number.isNaN(i.pos.x)||Number.isNaN(i.pos.y)||Number.isNaN(i.pos.z))return{trackNo:i.trackNo,status:"MASKED_NO_POS",isMasked:!0,radarOrigin:n,targetPoint:null,blockingPoint:null,label:`[MODELLED LOS / MASKING] ${i.trackNo} | MASKED (NO POSITION)`,isCoasting:!!i.masked,ghostSigmaM:i.ghostSigmaM??0};const r=i.pos,s=Math.hypot(r.x,r.y),a=Wo(r,e),o=!!i.masked,c=i.ghostSigmaM??0,l=o&&c>0?` | COAST ±${Math.round(c)}m`:"";if(!a.isMasked)return{trackNo:i.trackNo,status:"CLEAR",isMasked:!1,radarOrigin:n,targetPoint:{...r},blockingPoint:null,thetaT:a.thetaT,thetaMask:a.thetaMask,label:`[MODELLED LOS / MASKING] ${i.trackNo} | CLEAR | R:${Math.round(s)}m θ:${Fa(a.thetaT)}°${l}`,isCoasting:o,ghostSigmaM:c};const u=e.find(f=>f.id===a.zoneId);if(a.dNearM===0){let f=1/0;if(u)for(let m=0;m<u.polygon.length;m++){const p=u.polygon[m],T=u.polygon[(m+1)%u.polygon.length],y=zs(r.x,r.y,p,T);y!==null&&y<f&&(f=y)}const g=f<1/0&&s>0?Math.min(1,Math.max(0,f/s)):.5,_={x:g*r.x,y:g*r.y,z:t+g*(r.z-t)};return{trackNo:i.trackNo,status:"BLOCKED_INTERIOR",isMasked:!0,radarOrigin:n,targetPoint:{...r},blockingPoint:_,zoneId:a.zoneId,thetaT:a.thetaT,thetaMask:a.thetaMask,dNearM:f<1/0?f:0,shadowRemainingM:a.shadowRemainingM,label:`[MODELLED LOS / MASKING] ${i.trackNo} | BLOCKED: INSIDE [${a.zoneId??"ZONE"}] (z <= roof ${u?.heightM??"?"}m)${l}`,isCoasting:o,ghostSigmaM:c}}const h=s>0?Math.min(1,Math.max(0,a.dNearM/s)):.5,d={x:h*r.x,y:h*r.y,z:t+h*(r.z-t)};return{trackNo:i.trackNo,status:"BLOCKED_SHADOW",isMasked:!0,radarOrigin:n,targetPoint:{...r},blockingPoint:d,zoneId:a.zoneId,thetaT:a.thetaT,thetaMask:a.thetaMask,dNearM:a.dNearM,shadowRemainingM:a.shadowRemainingM,label:`[MODELLED LOS / MASKING] ${i.trackNo} | BLOCKED: SHADOW [${a.zoneId??"ZONE"}] (θT:${Fa(a.thetaT)}° < θM:${Fa(a.thetaMask)}°)${l}`,isCoasting:o,ghostSigmaM:c}}class Vu{group;clearLine;clearGeom;clearPositions;blockedLine;blockedGeom;blockedPositions;blockMarker;labelSprite;spriteCanvas;spriteCtx;spriteTexture;lastLabelText="";constructor(){this.group=new xt,this.group.name="los_visualizer_group",this.clearPositions=new Float32Array(6),this.clearGeom=new Ze,this.clearGeom.setAttribute("position",new Ht(this.clearPositions,3));const e=new Ke({color:3718648,transparent:!0,opacity:.9,linewidth:2});this.clearLine=new Mn(this.clearGeom,e),this.group.add(this.clearLine),this.blockedPositions=new Float32Array(6),this.blockedGeom=new Ze,this.blockedGeom.setAttribute("position",new Ht(this.blockedPositions,3));const t=new Ke({color:15680580,transparent:!0,opacity:.85,linewidth:2});this.blockedLine=new Mn(this.blockedGeom,t),this.group.add(this.blockedLine);const n=new rc(3.5,8,8),r=new _t({color:16347926,wireframe:!0});if(this.blockMarker=new mt(n,r),this.group.add(this.blockMarker),typeof document<"u"){this.spriteCanvas=document.createElement("canvas"),this.spriteCanvas.width=512,this.spriteCanvas.height=64,this.spriteCtx=this.spriteCanvas.getContext("2d"),this.spriteTexture=new Mi(this.spriteCanvas),this.spriteTexture.minFilter=qt;const s=new sn({map:this.spriteTexture,transparent:!0,depthTest:!1});this.labelSprite=new mn(s)}else{const s=new sn({transparent:!0,depthTest:!1});this.labelSprite=new mn(s)}this.labelSprite.scale.set(65,8,1),this.group.add(this.labelSprite),this.group.visible=!1}updateLabelSprite(e,t){if(e===this.lastLabelText||(this.lastLabelText=e,typeof document>"u"||!this.spriteCtx||!this.spriteTexture))return;const n=this.spriteCtx;n.clearRect(0,0,512,64),n.fillStyle=t?"rgba(30, 10, 10, 0.9)":"rgba(10, 25, 40, 0.9)",n.fillRect(4,4,504,56),n.strokeStyle=t?"#ef4444":"#38bdf8",n.lineWidth=2,n.strokeRect(4,4,504,56),n.fillStyle=t?"#fca5a5":"#bae6fd",n.font="bold 15px monospace",n.textAlign="center",n.textBaseline="middle",n.fillText(e,256,32),this.spriteTexture.needsUpdate=!0}update(e,t=[],n=vt.thresholds.antennaHeightM||15,r=!0){if(!r||!e||!e.pos){this.group.visible=!1;return}const s=Gu(e,t,n);this.group.visible=!0;const a=dt(s.radarOrigin.x,s.radarOrigin.y,s.radarOrigin.z);if(s.status==="MASKED_NO_POS"||!s.targetPoint){this.clearLine.visible=!1,this.blockedLine.visible=!1,this.blockMarker.visible=!1,this.labelSprite.visible=!0,this.labelSprite.position.set(a.x,a.y+15,a.z),this.updateLabelSprite(s.label,!0);return}const o=dt(s.targetPoint.x,s.targetPoint.y,s.targetPoint.z);if(s.status==="CLEAR"||!s.blockingPoint)this.clearLine.visible=!0,this.clearPositions[0]=a.x,this.clearPositions[1]=a.y,this.clearPositions[2]=a.z,this.clearPositions[3]=o.x,this.clearPositions[4]=o.y,this.clearPositions[5]=o.z,this.clearGeom.attributes.position.needsUpdate=!0,this.blockedLine.visible=!1,this.blockMarker.visible=!1,this.labelSprite.visible=!0,this.labelSprite.position.set((a.x+o.x)/2,Math.max(a.y,o.y)+12,(a.z+o.z)/2),this.updateLabelSprite(s.label,!1);else{const c=dt(s.blockingPoint.x,s.blockingPoint.y,s.blockingPoint.z);this.clearLine.visible=!0,this.clearPositions[0]=a.x,this.clearPositions[1]=a.y,this.clearPositions[2]=a.z,this.clearPositions[3]=c.x,this.clearPositions[4]=c.y,this.clearPositions[5]=c.z,this.clearGeom.attributes.position.needsUpdate=!0,this.blockedLine.visible=!0,this.blockedPositions[0]=c.x,this.blockedPositions[1]=c.y,this.blockedPositions[2]=c.z,this.blockedPositions[3]=o.x,this.blockedPositions[4]=o.y,this.blockedPositions[5]=o.z,this.blockedGeom.attributes.position.needsUpdate=!0,this.blockMarker.visible=!0,this.blockMarker.position.set(c.x,c.y,c.z),this.labelSprite.visible=!0,this.labelSprite.position.set(c.x,Math.max(c.y,o.y)+14,c.z),this.updateLabelSprite(s.label,!0)}}dispose(){this.clearGeom.dispose(),this.clearLine.material.dispose(),this.blockedGeom.dispose(),this.blockedLine.material.dispose(),this.blockMarker.geometry.dispose(),this.blockMarker.material.dispose(),this.spriteTexture?.dispose(),this.labelSprite.material.dispose(),this.group.clear()}}function Hu(i){return i<=40?"LOW":i<=100?"MID":"HIGH"}function Bo(i){switch(i){case"LOW":return{floorM:0,ceilM:40,midM:20};case"MID":return{floorM:40,ceilM:100,midM:70};case"HIGH":return{floorM:100,ceilM:160,midM:150}}}const ev=200,tv=3;function zo(i,e){return Math.hypot(i.x-e.x,i.y-e.y)}function Fl(i,e,t){return(e.x-i.x)*(t.y-i.y)-(e.y-i.y)*(t.x-i.x)}function Wu(i){if(i.length<=2)return i.slice();const e=i.slice().sort((r,s)=>Math.abs(r.x-s.x)>1e-6?r.x-s.x:r.y-s.y),t=[];for(const r of e){for(;t.length>=2&&Fl(t[t.length-2],t[t.length-1],r)<=0;)t.pop();t.push(r)}const n=[];for(let r=e.length-1;r>=0;r--){const s=e[r];for(;n.length>=2&&Fl(n[n.length-2],n[n.length-1],s)<=0;)n.pop();n.push(s)}return t.pop(),n.pop(),t.concat(n)}function Go(i){const e=i.length;if(e<3)return 0;let t=0;for(let n=0;n<e;n++){const r=(n+1)%e;t+=i[n].x*i[r].y,t-=i[r].x*i[n].y}return Math.abs(t)*.5}function nv(i,e){if(i.length===0)return[];let t=0,n=0;for(const c of i)t+=c.x,n+=c.y;t/=i.length,n/=i.length;let r=e*.5;for(const c of i){const l=zo({x:t,y:n},c);l>r&&(r=l)}const s=r+25,a=[],o=8;for(let c=0;c<o;c++){const l=c/o*Math.PI*2;a.push({x:t+Math.cos(l)*s,y:n+Math.sin(l)*s})}return a}function Xu(i,e={}){const t=e.epsM??ev,n=e.minPts??tv,r=i.filter(h=>h.step!=="UNDETECTED"&&h.step!=="CLOSED"&&(h.lifecycle==="ACTIVE"||h.lifecycle==="LEAKED"||h.lifecycle==="NEUTRALISED")).slice().sort((h,d)=>h.trackNo.localeCompare(d.trackNo));if(r.length<n)return[];const s=r.length,a=new Set,o=new Set,c=[],l=Array.from({length:s},()=>Array(s).fill(0));for(let h=0;h<s;h++)for(let d=h+1;d<s;d++){const f=zo(r[h].pos,r[d].pos);l[h][d]=f,l[d][h]=f}for(let h=0;h<s;h++){const d=r[h];if(a.has(d.trackNo))continue;a.add(d.trackNo);const f=[];for(let g=0;g<s;g++)l[h][g]<=t&&f.push(g);if(f.length>=n){const g=[d];o.add(d.trackNo);const _=[...f];for(;_.length>0;){const m=_.shift(),p=r[m];if(!a.has(p.trackNo)){a.add(p.trackNo);const T=[];for(let y=0;y<s;y++)l[m][y]<=t&&T.push(y);T.length>=n&&_.push(...T)}o.has(p.trackNo)||(o.add(p.trackNo),g.push(p))}g.sort((m,p)=>m.trackNo.localeCompare(p.trackNo)),c.push(g)}}c.sort((h,d)=>h[0].trackNo.localeCompare(d[0].trackNo));const u=[];for(let h=0;h<c.length;h++){const d=c[h],f=d.length,g=d.map(O=>O.trackNo),_=`C-${String(h+1).padStart(2,"0")}`,m=d.map(O=>({x:O.pos.x,y:O.pos.y}));let p=0,T=0;for(const O of m)p+=O.x,T+=O.y;p/=f,T/=f;const y={x:p,y:T};let v=0;for(let O=0;O<f;O++){let J=1/0;for(let se=0;se<f;se++){if(O===se)continue;const ve=zo(m[O],m[se]);ve<J&&(J=ve)}v+=J===1/0?0:J}const L=v/f;let R=Wu(m),C=Go(R),I=!1;(R.length<3||C<100)&&(I=!0,R=nv(m,t),C=Go(R));const E=C/1e6,x=f/Math.max(.001,E),P=new Set;for(const O of d)P.add(Hu(O.pos.z));const z=P.has("LOW")?"LOW":P.has("MID")?"MID":"HIGH",U=P.has("HIGH")?"HIGH":P.has("MID")?"MID":"LOW",B=z===U?z:`${z}–${U}`,X=Bo(z).floorM,G=Bo(U).ceilM,K=`CLUSTER ${f} · ${B} · ${x.toFixed(1)} TRK/KM² · SPACING ${Math.round(L)}m`;u.push({clusterId:_,trackNos:g,count:f,hull2D:R,centroid:y,areaKm2:E,densityTrkPerKm2:x,meanSpacingM:L,lowestBand:z,highestBand:U,altSpan:B,zMinM:X,zMaxM:G,label:K,isDegenerate:I})}return u}const Ol=16750848;class Yu{group;clusterMeshMap=new Map;sharedFillMaterial;sharedEdgeMaterial;options;constructor(e={}){this.group=new xt,this.group.name="ClusterOverlay3D",this.options=e,this.sharedFillMaterial=new _t({color:Ol,transparent:!0,opacity:.08,depthWrite:!1,side:bt}),this.sharedEdgeMaterial=new Ke({color:Ol,transparent:!0,opacity:.45,linewidth:1})}createLabelTexture(e){if(typeof document>"u")return new Nt;const t=document.createElement("canvas");t.width=384,t.height=48;const n=t.getContext("2d");n&&(n.fillStyle="rgba(13, 17, 23, 0.85)",n.fillRect(0,0,384,48),n.strokeStyle="#FF9900",n.lineWidth=1.5,n.strokeRect(1,1,382,46),n.font='bold 13px "JetBrains Mono", monospace',n.fillStyle="#FF9900",n.textAlign="center",n.textBaseline="middle",n.fillText(e,192,24));const r=new Mi(t);return r.needsUpdate=!0,r}buildExtrudedPrism(e,t,n){const r=new Ws,s=dt(e[0].x,e[0].y,0);r.moveTo(s.x,-s.z);for(let d=1;d<e.length;d++){const f=dt(e[d].x,e[d].y,0);r.lineTo(f.x,-f.z)}r.closePath();const o={depth:Math.max(10,n-t),bevelEnabled:!1},c=new zr(r,o);c.rotateX(Math.PI/2),c.translate(0,t,0);const l=[],u=e.length;for(let d=0;d<u;d++){const f=(d+1)%u,g=dt(e[d].x,e[d].y,t),_=dt(e[f].x,e[f].y,t);l.push(new w(g.x,g.y,g.z)),l.push(new w(_.x,_.y,_.z));const m=dt(e[d].x,e[d].y,n),p=dt(e[f].x,e[f].y,n);l.push(new w(m.x,m.y,m.z)),l.push(new w(p.x,p.y,p.z)),l.push(new w(g.x,g.y,g.z)),l.push(new w(m.x,m.y,m.z))}const h=new Ze().setFromPoints(l);return{fillGeo:c,edgeGeo:h}}update(e,t){if(!t)return this.group.visible=!1,[];this.group.visible=!0;const n=Xu(e,this.options),r=new Set;for(const s of n){const a=s.clusterId;r.add(a);const{fillGeo:o,edgeGeo:c}=this.buildExtrudedPrism(s.hull2D,s.zMinM,s.zMaxM);let l=this.clusterMeshMap.get(a);if(l)l.fillMesh.geometry.dispose(),l.fillMesh.geometry=o,l.edgeLines.geometry.dispose(),l.edgeLines.geometry=c,l.labelSprite.material.map?.dispose(),l.labelSprite.material.map=this.createLabelTexture(s.label);else{const h=new xt,d=new mt(o,this.sharedFillMaterial);d.renderOrder=1;const f=new Gt(c,this.sharedEdgeMaterial),g=new sn({map:this.createLabelTexture(s.label),transparent:!0,depthTest:!1}),_=new mn(g);_.scale.set(180,24,1),h.add(d),h.add(f),h.add(_),this.group.add(h),l={group:h,fillMesh:d,edgeLines:f,labelSprite:_},this.clusterMeshMap.set(a,l)}const u=dt(s.centroid.x,s.centroid.y,s.zMaxM+25);l.labelSprite.position.set(u.x,u.y,u.z)}for(const[s,a]of this.clusterMeshMap)r.has(s)||(a.fillMesh.geometry.dispose(),a.edgeLines.geometry.dispose(),a.labelSprite.material.map?.dispose(),a.labelSprite.material.dispose(),this.group.remove(a.group),this.clusterMeshMap.delete(s));return n}dispose(){for(const[,e]of this.clusterMeshMap)e.fillMesh.geometry.dispose(),e.edgeLines.geometry.dispose(),e.labelSprite.material.map?.dispose(),e.labelSprite.material.dispose(),this.group.remove(e.group);this.clusterMeshMap.clear(),this.sharedFillMaterial.dispose(),this.sharedEdgeMaterial.dispose()}}class qu{group;zones;maxRangeM;antennaHeightM;shadowMeshes=[];shadowLineSegments=[];rcsRings=[];sprites=[];texturesToDispose=[];materialsToDispose=[];geometriesToDispose=[];constructor(e={}){this.group=new xt,this.group.name="TrainingAid3DGroup",this.group.visible=!1,this.zones=e.zones??[],this.maxRangeM=e.maxRangeM??(vt.thresholds.radarMaxRangeM||5e3),this.antennaHeightM=e.antennaHeightM??(vt.thresholds.antennaHeightM||15),this.buildShadowVolumes(),this.buildRcsShells()}setVisible(e){this.group.visible=e}get visible(){return this.group.visible}buildShadowVolumes(){const e=new _t({color:16096779,transparent:!0,opacity:.12,depthWrite:!1,side:bt});this.materialsToDispose.push(e);const t=new Ke({color:16498468,transparent:!0,opacity:.4});this.materialsToDispose.push(t);for(const n of this.zones){if(n.polygon.length<3)continue;let r=0,s=0;for(const d of n.polygon)r+=d[0],s+=d[1];r/=n.polygon.length,s/=n.polygon.length;const a=Math.hypot(r,s);if(a<1)continue;for(let d=0;d<n.polygon.length;d++){const f=n.polygon[d],g=n.polygon[(d+1)%n.polygon.length],_=Math.hypot(f[0],f[1]),m=Math.hypot(g[0],g[1]);if(_<1||m<1)continue;const p=g[0]-f[0],T=g[1]-f[1],y=(f[0]+g[0])/2,v=(f[1]+g[1])/2;if(y*T-v*p<0)continue;const R=(_+n.shadowM)/_,C=(m+n.shadowM)/m,I=[f[0]*R,f[1]*R],E=[g[0]*C,g[1]*C],x=n.heightM,P=Math.min(180,this.antennaHeightM+R*(n.heightM-this.antennaHeightM)),z=Math.min(180,this.antennaHeightM+C*(n.heightM-this.antennaHeightM)),U=dt(f[0],f[1],0),B=dt(g[0],g[1],0),X=dt(g[0],g[1],x),G=dt(f[0],f[1],x),K=dt(I[0],I[1],0),O=dt(E[0],E[1],0),J=dt(E[0],E[1],z),se=dt(I[0],I[1],P),ve=[U.x,U.y,U.z,B.x,B.y,B.z,X.x,X.y,X.z,U.x,U.y,U.z,X.x,X.y,X.z,G.x,G.y,G.z,K.x,K.y,K.z,J.x,J.y,J.z,O.x,O.y,O.z,K.x,K.y,K.z,se.x,se.y,se.z,J.x,J.y,J.z,G.x,G.y,G.z,X.x,X.y,X.z,J.x,J.y,J.z,G.x,G.y,G.z,J.x,J.y,J.z,se.x,se.y,se.z,U.x,U.y,U.z,O.x,O.y,O.z,B.x,B.y,B.z,U.x,U.y,U.z,K.x,K.y,K.z,O.x,O.y,O.z,U.x,U.y,U.z,G.x,G.y,G.z,se.x,se.y,se.z,U.x,U.y,U.z,se.x,se.y,se.z,K.x,K.y,K.z,B.x,B.y,B.z,J.x,J.y,J.z,X.x,X.y,X.z,B.x,B.y,B.z,O.x,O.y,O.z,J.x,J.y,J.z],Ue=new Ze;Ue.setAttribute("position",new ft(ve,3)),Ue.computeVertexNormals(),this.geometriesToDispose.push(Ue);const Qe=new mt(Ue,e);Qe.renderOrder=2,this.shadowMeshes.push(Qe),this.group.add(Qe);const Y=new ic(Ue);this.geometriesToDispose.push(Y);const ae=new Gt(Y,t);ae.renderOrder=3,this.shadowLineSegments.push(ae),this.group.add(ae)}const o=a+n.shadowM/2,c=r/a*o,l=s/a*o,u=`ZONE ${n.id} SHADOW · H:${n.heightM}m · REACH:${n.shadowM}m (APPROX)`,h=this.createTacticalSprite(u,c,l,n.heightM+15);h&&(this.sprites.push(h),this.group.add(h))}}buildRcsShells(){const e=Ou(this.maxRangeM);for(const t of e){const r=[];for(let u=0;u<=64;u++){const h=u/64*Math.PI*2,d=t.radiusM*Math.cos(h),f=t.radiusM*Math.sin(h),g=dt(d,f,1.5);r.push(g.x,g.y,g.z)}const s=new Ze;s.setAttribute("position",new ft(r,3)),this.geometriesToDispose.push(s);const a=t.isGuaranteedLimit?440020:3718648,o=new Ke({color:a,transparent:!0,opacity:t.isGuaranteedLimit?.45:.25});this.materialsToDispose.push(o);const c=new Mn(s,o);c.renderOrder=2,this.rcsRings.push(c),this.group.add(c);const l=this.createTacticalSprite(t.label,0,t.radiusM,20);l&&(this.sprites.push(l),this.group.add(l))}}createTacticalSprite(e,t,n,r){if(typeof document>"u")return null;const s=document.createElement("canvas");s.width=512,s.height=64;const a=s.getContext("2d");if(!a)return null;a.fillStyle="rgba(10, 15, 20, 0.85)",a.fillRect(0,0,512,64),a.strokeStyle="#f59e0b",a.lineWidth=2,a.strokeRect(1,1,510,62),a.fillStyle="#fde68a",a.font="bold 18px monospace",a.textAlign="center",a.textBaseline="middle",a.fillText(e,256,32);const o=new Mi(s);this.texturesToDispose.push(o);const c=new sn({map:o,transparent:!0,depthWrite:!1,opacity:.85});this.materialsToDispose.push(c);const l=new mn(c),u=dt(t,n,r);return l.position.copy(u),l.scale.set(160,20,1),l.renderOrder=4,l}dispose(){for(const e of this.shadowMeshes)this.group.remove(e);for(const e of this.shadowLineSegments)this.group.remove(e);for(const e of this.rcsRings)this.group.remove(e);for(const e of this.sprites)this.group.remove(e);for(const e of this.geometriesToDispose)e.dispose();for(const e of this.materialsToDispose)e.dispose();for(const e of this.texturesToDispose)e.dispose();this.shadowMeshes=[],this.shadowLineSegments=[],this.rcsRings=[],this.sprites=[],this.geometriesToDispose=[],this.materialsToDispose=[],this.texturesToDispose=[]}}const iv=856343,rv=1448738,kl=2501427,Bl=65382,Oa=15130,ka=16750848,sv=16724787,Ba=52479,av=16763904;class Zu{scene;staticGroup;zonesGroup;tracksGroup;coverage3d;effectorEnvelopes3d;losVisualizer3d;clusterOverlay3d;trainingAid3d;zones;trackMeshMap=new Map;sharedGeometries;sharedMaterials;constructor(e){this.scene=new vu,this.scene.background=new tt(iv),this.zones=e.zones||[],this.staticGroup=new xt,this.zonesGroup=new xt,this.tracksGroup=new xt,this.coverage3d=new Nu,this.effectorEnvelopes3d=new zu,this.losVisualizer3d=new Vu,this.clusterOverlay3d=new Yu,this.trainingAid3d=new qu({zones:this.zones,maxRangeM:e.maxRangeM}),this.scene.add(this.staticGroup),this.scene.add(this.zonesGroup),this.scene.add(this.tracksGroup),this.scene.add(this.coverage3d.group),this.scene.add(this.effectorEnvelopes3d.group),this.scene.add(this.losVisualizer3d.group),this.scene.add(this.clusterOverlay3d.group),this.scene.add(this.trainingAid3d.group),e.showTrainingAid&&e.mode!=="EVAL"&&this.trainingAid3d.setVisible(!0),this.sharedGeometries={diamond:new Ys(25,0),cube:new xi(30,30,30),cylinder:new or(20,20,15,8),stem:new Ze().setFromPoints([new w(0,0,0),new w(0,1,0)]),selection:this.createSelectionBracketGeometry(40)},this.sharedMaterials={threat:new _t({color:sv,wireframe:!0}),friend:new _t({color:Ba,wireframe:!0}),civil:new _t({color:Bl,wireframe:!0}),unknown:new _t({color:av,wireframe:!0}),stem:new Ke({color:Oa,transparent:!0,opacity:.6}),stemSelected:new Ke({color:Ba,transparent:!0,opacity:.9}),selection:new Ke({color:Ba,depthTest:!1}),ghostCoasting:new Ke({color:ka,transparent:!0,opacity:.8})},this.buildStaticGround(e.maxRangeM,e.rMinM),e.zones&&e.zones.length>0&&this.buildZones(e.zones)}createSelectionBracketGeometry(e){const t=e/2,n=t*.4,r=[new w(-t,0,-t+n),new w(-t,0,-t),new w(-t,0,-t),new w(-t+n,0,-t),new w(t-n,0,-t),new w(t,0,-t),new w(t,0,-t),new w(t,0,-t+n),new w(-t,0,t-n),new w(-t,0,t),new w(-t,0,t),new w(-t+n,0,t),new w(t-n,0,t),new w(t,0,t),new w(t,0,t),new w(t,0,t-n)];return new Ze().setFromPoints(r)}buildStaticGround(e,t){const n=e*2,r=20,s=new sp(n,r,kl,rv);s.position.y=-.5,this.staticGroup.add(s);for(let T=1e3;T<=e;T+=1e3){const y=this.createCircleGeometry(T,64),v=new Ke({color:Oa,transparent:!0,opacity:.5}),L=new Zn(y,v);L.position.y=0,this.staticGroup.add(L)}const a=this.createCircleGeometry(t,64),o=new Ke({color:ka,transparent:!0,opacity:.8}),c=new Zn(a,o);c.position.y=.5,this.staticGroup.add(c);const l=100,u=[new w(-l,0,0),new w(l,0,0),new w(0,0,-l),new w(0,0,l),new w(0,0,0),new w(0,150,0)],h=new Ze().setFromPoints(u),d=new Ke({color:Bl}),f=new Gt(h,d);this.staticGroup.add(f);const g=e,_=[new w(0,0,0),new w(0,0,-g),new w(0,0,0),new w(g,0,0)],m=new Ze().setFromPoints(_),p=new Ke({color:kl,transparent:!0,opacity:.7});this.staticGroup.add(new Gt(m,p))}createCircleGeometry(e,t){const n=[];for(let r=0;r<=t;r++){const s=r/t*Math.PI*2;n.push(new w(Math.cos(s)*e,0,Math.sin(s)*e))}return new Ze().setFromPoints(n)}clearZones(){for(;this.zonesGroup.children.length>0;){const e=this.zonesGroup.children[0];this.zonesGroup.remove(e),e instanceof mt&&(e.geometry.dispose(),Array.isArray(e.material)?e.material.forEach(t=>t.dispose()):e.material.dispose())}}createZoneMesh(e){if(e.polygon.length<3)return;const t=new Ws,n=dt(e.polygon[0][0],e.polygon[0][1],0);t.moveTo(n.x,-n.z);for(let f=1;f<e.polygon.length;f++){const g=dt(e.polygon[f][0],e.polygon[f][1],0);t.lineTo(g.x,-g.z)}t.closePath();const r={depth:e.heightM,bevelEnabled:!1},s=new zr(t,r);s.rotateX(Math.PI/2);const a=e.type==="URBAN",o=a?ka:Oa,c=new _t({color:o,transparent:!0,opacity:a?.15:.08,depthWrite:!1}),l=new mt(s,c);this.zonesGroup.add(l);const u=new ic(s),h=new Ke({color:o,transparent:!0,opacity:.6}),d=new Gt(u,h);this.zonesGroup.add(d)}buildZones(e){this.clearZones();for(const t of e)this.createZoneMesh(t)}createTextSprite(e,t){if(typeof document>"u"){const c=new sn({transparent:!0,depthTest:!1}),l=new mn(c);return l.scale.set(100,25,1),l}const n=document.createElement("canvas");n.width=128,n.height=32;const r=n.getContext("2d");r&&(r.fillStyle="rgba(13, 17, 23, 0.75)",r.fillRect(0,0,128,32),r.strokeStyle=t,r.lineWidth=2,r.strokeRect(1,1,126,30),r.font="bold 16px monospace",r.fillStyle=t,r.textAlign="center",r.textBaseline="middle",r.fillText(e,64,16));const s=new Mi(n);s.minFilter=qt;const a=new sn({map:s,transparent:!0,depthTest:!1}),o=new mn(a);return o.scale.set(100,25,1),o}getOrCreateTrackRecord(e){let t=this.trackMeshMap.get(e);if(t)return t;const n=new xt,r=new mt(this.sharedGeometries.diamond,this.sharedMaterials.threat);n.add(r);const s=new Mn(this.sharedGeometries.stem,this.sharedMaterials.stem);n.add(s);const a=this.createTextSprite(e,"#00FF66");a.position.set(0,35,0),n.add(a);const o=new Gt(this.sharedGeometries.selection,this.sharedMaterials.selection);return o.visible=!1,n.add(o),t={group:n,marker:r,stem:s,ghostRing:null,labelSprite:a,selectionBox:o},this.trackMeshMap.set(e,t),this.tracksGroup.add(n),t}applyTrackSymbology(e,t){t==="FRIENDLY"?(e.geometry=this.sharedGeometries.cylinder,e.material=this.sharedMaterials.friend):t==="CIVIL_UAS"?(e.geometry=this.sharedGeometries.cube,e.material=this.sharedMaterials.civil):t==="HOSTILE_ATTACK"||t==="HOSTILE_ISR"||t==="SWARM_ELEMENT"?(e.geometry=this.sharedGeometries.diamond,e.material=this.sharedMaterials.threat):(e.geometry=this.sharedGeometries.diamond,e.material=this.sharedMaterials.unknown)}updateGhostRing(e,t){if(t.masked&&t.ghostSigmaM>0){if(!e.ghostRing){const n=this.createCircleGeometry(1,32);e.ghostRing=new Zn(n,this.sharedMaterials.ghostCoasting),e.group.add(e.ghostRing)}e.ghostRing.visible=!0,e.ghostRing.scale.set(t.ghostSigmaM,1,t.ghostSigmaM)}else e.ghostRing&&(e.ghostRing.visible=!1)}pruneInactiveTracks(e){for(const[t,n]of this.trackMeshMap.entries())e.has(t)||(this.tracksGroup.remove(n.group),n.labelSprite.material.map&&n.labelSprite.material.map.dispose(),n.labelSprite.material.dispose(),n.ghostRing&&n.ghostRing.geometry.dispose(),this.trackMeshMap.delete(t))}updateTracks(e,t){const n=new Set;for(const r of e){n.add(r.trackNo);const s=this.getOrCreateTrackRecord(r.trackNo),a=dt(r.pos.x,r.pos.y,r.pos.z);s.group.position.set(a.x,0,a.z),s.marker.position.set(0,a.y,0),s.stem.scale.set(1,Math.max(1,a.y),1),this.applyTrackSymbology(s.marker,r.traineeLabel);const o=r.trackNo===t||r.isSelected;s.selectionBox&&(s.selectionBox.visible=o,s.selectionBox.position.set(0,a.y,0)),s.stem.material=o?this.sharedMaterials.stemSelected:this.sharedMaterials.stem,this.updateGhostRing(s,r)}this.pruneInactiveTracks(n)}updateCoverage(e){this.coverage3d.update(e)}setSensorFilter(e){this.coverage3d.setSensorFilter(e)}updateEffectorEnvelopes(e){this.effectorEnvelopes3d.update(e)}updateLos(e,t=!0){this.losVisualizer3d.update(e,this.zones,void 0,t)}updateClusters(e,t=!0){this.clusterOverlay3d.update(e,t)}updateTrainingAid(e){this.trainingAid3d.setVisible(e)}dispose(){this.coverage3d.dispose(),this.effectorEnvelopes3d.dispose(),this.losVisualizer3d.dispose(),this.clusterOverlay3d.dispose(),this.trainingAid3d.dispose();for(const e of this.trackMeshMap.values())e.labelSprite.material.map&&e.labelSprite.material.map.dispose(),e.labelSprite.material.dispose(),e.ghostRing&&e.ghostRing.geometry.dispose();this.trackMeshMap.clear(),Object.values(this.sharedGeometries).forEach(e=>e.dispose()),Object.values(this.sharedMaterials).forEach(e=>e.dispose()),this.scene.clear()}}let Wn=null;function $u(){if(Wn)return Wn;if(typeof window>"u"||typeof document>"u")return{supported:!1,reason:"Non-browser execution environment"};try{return document.createElement("canvas").getContext("webgl2")?(Wn={supported:!0},Wn):(Wn={supported:!1,reason:"WebGL2 is not supported by your browser or GPU drivers."},Wn)}catch(i){return Wn={supported:!1,reason:i instanceof Error?i.message:"Unknown WebGL2 probe error"},Wn}}function ov(){return $u().supported}function Ku(i,e){const t=n=>{n.preventDefault(),console.warn("[Render3D] WebGL2 Context Lost. Initiating fallback to 2D Canvas baseline."),e(n)};return i.addEventListener("webglcontextlost",t,!1),()=>{i.removeEventListener("webglcontextlost",t,!1)}}class cv{canvas;renderer;camera;scene3d;animFrameId=null;cleanupContextLoss=null;target=new w(0,0,0);spherical=new rp(7500,Math.PI/3,Math.PI/4);isDragging=!1;previousMousePosition={x:0,y:0};currentPreset="OBLIQUE";getTracks;getCoverage;getEffectorOptions;showLos=!0;showClusters=!0;showTrainingAid=!1;options;setTrackProvider(e){this.getTracks=e}setCoverageProvider(e){this.getCoverage=e}setEffectorProvider(e){this.getEffectorOptions=e}setShowLos(e){this.showLos=e}setShowClusters(e){this.showClusters=e}setShowTrainingAid(e){if(this.options.mode==="EVAL"){this.showTrainingAid=!1,this.scene3d.updateTrainingAid(!1);return}this.showTrainingAid=e,this.scene3d.updateTrainingAid(e)}get isTrainingAidVisible(){return this.showTrainingAid}constructor(e,t){this.canvas=e,this.options=t,t.showTrainingAid&&t.mode!=="EVAL"&&(this.showTrainingAid=!0),this.renderer=new G0({canvas:e,antialias:!0,alpha:!1,powerPreference:"default"}),this.renderer.setSize(e.width,e.height,!1),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));const n=e.width/e.height;this.camera=new rn(45,n,10,35e3),this.applyCameraPreset("OBLIQUE"),this.scene3d=new Zu(t),t.onContextLost&&(this.cleanupContextLoss=Ku(e,()=>{this.stop(),t.onContextLost?.()})),this.attachMouseControls()}applyCameraPreset(e){this.currentPreset=e,this.target.set(0,0,0),e==="OBLIQUE"?(this.spherical.set(7500,Math.PI/3.2,Math.PI/4),this.camera.up.set(0,1,0)):e==="TOP"?(this.spherical.set(9500,.001,0),this.camera.up.set(0,0,-1)):e==="POST"&&(this.spherical.set(4500,Math.PI/2.2,0),this.camera.up.set(0,1,0)),this.updateCameraFromSpherical()}setPreset(e){this.applyCameraPreset(e)}updateCameraFromSpherical(){const e=new w().setFromSpherical(this.spherical);this.camera.position.copy(this.target).add(e),this.camera.lookAt(this.target)}attachMouseControls(){const e=s=>{(s.button===0||s.button===2)&&(this.isDragging=!0,this.previousMousePosition={x:s.clientX,y:s.clientY})},t=s=>{if(!this.isDragging)return;const a=s.clientX-this.previousMousePosition.x,o=s.clientY-this.previousMousePosition.y;this.previousMousePosition={x:s.clientX,y:s.clientY},this.spherical.theta-=a*.006,this.spherical.phi=Math.max(.01,Math.min(Math.PI/2-.02,this.spherical.phi-o*.006)),this.updateCameraFromSpherical()},n=()=>{this.isDragging=!1},r=s=>{s.preventDefault();const a=s.deltaY>0?1.1:.9;this.spherical.radius=Math.max(800,Math.min(25e3,this.spherical.radius*a)),this.updateCameraFromSpherical()};this.canvas.addEventListener("mousedown",e),window.addEventListener("mousemove",t),window.addEventListener("mouseup",n),this.canvas.addEventListener("wheel",r,{passive:!1}),this.detachMouseControls=()=>{this.canvas.removeEventListener("mousedown",e),window.removeEventListener("mousemove",t),window.removeEventListener("mouseup",n),this.canvas.removeEventListener("wheel",r)}}detachMouseControls=()=>{};update(e,t){this.scene3d.updateTracks(e,t)}updateCoverage(e){this.scene3d.updateCoverage(e)}setSensorFilter(e){this.scene3d.setSensorFilter(e)}getScene3D(){return this.scene3d}updateEffectorEnvelopes(e){this.scene3d.updateEffectorEnvelopes(e)}updateLos(e){this.scene3d.updateLos(e,this.showLos)}start(){if(this.animFrameId!==null)return;const e=()=>{if(this.getTracks){const{tracks:t,selectedTrackNo:n}=this.getTracks();this.update(t,n);const r=n?t.find(s=>s.trackNo===n)??null:null;this.scene3d.updateLos(r,this.showLos),this.scene3d.updateClusters(t,this.showClusters)}if(this.getCoverage){const t=this.getCoverage();this.updateCoverage(t)}if(this.getEffectorOptions){const t=this.getEffectorOptions();this.updateEffectorEnvelopes(t)}this.renderer.render(this.scene3d.scene,this.camera),this.animFrameId=requestAnimationFrame(e)};this.animFrameId=requestAnimationFrame(e)}stop(){this.animFrameId!==null&&(cancelAnimationFrame(this.animFrameId),this.animFrameId=null)}resize(e,t){this.camera.aspect=e/t,this.camera.updateProjectionMatrix(),this.renderer.setSize(e,t,!1)}dispose(){this.stop(),this.detachMouseControls(),this.cleanupContextLoss&&(this.cleanupContextLoss(),this.cleanupContextLoss=null),this.scene3d.dispose(),this.renderer.dispose()}}const fv=Object.freeze(Object.defineProperty({__proto__:null,ClusterOverlay3D:Yu,Coverage3D:Nu,EffectorEnvelopes3D:zu,LosVisualizer3D:Vu,Renderer3D:cv,Scene3D:Zu,TrainingAid3D:qu,attachContextLossHandler:Ku,bearingRangeToCartesian:Uu,calculateCrossSection:J0,calculateEffectorEnvelopes:ku,calculateEoirCoverage:Z0,calculateModelledLos:Gu,calculateRadarCoverage:q0,calculateRadarR90Radius:wr,calculateRadarRcsShells:Ou,calculateRfCoverage:$0,calculateShadowCeilingAt:Fu,calculateTrackEngagementCue:Bu,checkWebGL2Support:$u,computeConvexHull2D:Wu,computePolygonAreaM2:Go,detectTrackClusters:Xu,getAltBand:Hu,getAltBandBounds:Bo,isChaosActive:On,isWebGL2Available:ov,toSimCoords:H0,toThree:dt,toThreeCoords:V0},Symbol.toStringTag,{value:"Module"}));export{dv as A,vt as C,rn as P,rp as S,w as V,G0 as W,uv as a,J0 as b,hv as c,fv as d,Wo as e,Ho as i,lv as r};
