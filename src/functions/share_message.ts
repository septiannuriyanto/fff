import { getFTFromWH, getNameFromNrp } from "./get_nrp";

const constructMessage = async (ritationData:RitasiFuelData) =>{

    const fuelman = await getNameFromNrp(ritationData.fuelman_id);
    const operator = await getNameFromNrp(ritationData.operator_id);
    const ft = await getFTFromWH(ritationData.warehouse_id);

    const averageTeraBefore = (ritationData.sonding_before_front + ritationData.sonding_before_rear)/2;
    const averageTeraAfter = (ritationData.sonding_after_front + ritationData.sonding_after_rear)/2;
    const url = `https://fff-project.vercel.app/reporting/ritation/${ritationData.no_surat_jalan}`;
    const information = `LAPORAN RITASI\n
    *====== Data Ritasi =======*
    Tanggal : ${ritationData.ritation_date}
    No. Surat jalan : ${ritationData.no_surat_jalan}
    Fuel Truck : ${ft}
    Operator : ${operator}
    Fuelman : ${fuelman}
    *====== Sonding Before =======*
    Depan : ${ritationData.sonding_before_front} cm
    Belakang : ${ritationData.sonding_before_rear} cm
    Rata-Rata : ${averageTeraBefore} cm
    Qty : ${ritationData.qty_sonding_before} liter
    *====== Sonding After =======*
    Depan : ${ritationData.sonding_after_front} cm
    Belakang : ${ritationData.sonding_after_rear} cm
    Rata-Rata : ${averageTeraAfter} cm
    Qty : ${ritationData.qty_sonding_after} liter
    *====== Flowmeter =======*
    Before : ${ritationData.qty_flowmeter_before}
    After : ${ritationData.qty_flowmeter_after}
    Selisih : ${
        ritationData.qty_flowmeter_after - ritationData.qty_flowmeter_before
    } liter
    *====== Summary =======*
    Qty by Sonding ${ritationData.qty_sonding} liter
    Qty by SJ : ${ritationData.qty_sj} liter
    \nDetail : ${url}
    `;
    return information;

}


const shareMessageToWhatsapp =(information:any)=>{
    const message = encodeURIComponent(information);

    // WhatsApp API link
    const whatsappUrl = `https://api.whatsapp.com/send?text=${message}`;

    // Open the URL
    window.open(whatsappUrl, '_blank');
}


export { constructMessage, shareMessageToWhatsapp }