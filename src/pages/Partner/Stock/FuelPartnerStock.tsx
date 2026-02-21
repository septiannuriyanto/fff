import React from 'react'
import PanelContainer from '../../../components/Panels/PanelContainer'
import FuelStockManagement from '../../Dashboard/StockManagement/pages/FuelStockManagement'

const FuelPartnerStock = () => {
  return (
    <PanelContainer title="Fuel Partner Stock">
        <FuelStockManagement/>
    </PanelContainer>
  )
}

export default FuelPartnerStock