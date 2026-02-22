import React from 'react'
import ThemedPanelContainer from '../../../common/ThemedComponents/ThemedPanelContainer';
import FuelStockManagement from '../../Dashboard/StockManagement/pages/FuelStockManagement'

const FuelPartnerStock = () => {
  return (
    <ThemedPanelContainer title="Fuel Partner Stock">
        <FuelStockManagement/>
    </ThemedPanelContainer>
  )
}

export default FuelPartnerStock