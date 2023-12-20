import React, { useCallback, useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { useCssHandles } from 'vtex.css-handles'
import { DispatchFunction } from 'vtex.product-context/ProductDispatchContext'
import { ProductContext } from 'vtex.product-context'
import { OrderForm } from 'vtex.order-manager'

import DropdownProductQuantity from './DropdownProductQuantity'
import StepperProductQuantity from './StepperProductQuantity'

export type NumericSize = 'small' | 'regular' | 'large'
export type SelectorType = 'stepper' | 'dropdown'
export type QuantitySelectorStepType = 'unitMultiplier' | 'singleUnit'

interface referenceId {
  Key: string
  Value: string 
}
interface CustomSelectedItem{
  referenceId: referenceId[]
}

type CustomSelectedItemExtended = CustomSelectedItem & ProductContext['selectedItem'];

export interface BaseProps {
  dispatch: DispatchFunction
  selectedItem?: CustomSelectedItemExtended
  showLabel?: boolean
  selectedQuantity: number
  selectorType?: SelectorType
  size?: NumericSize
  warningQuantityThreshold: number
  showUnit: boolean
  quantitySelectorStep?: QuantitySelectorStepType
}

const CSS_HANDLES = [
  'quantitySelectorContainer',
  'quantitySelectorTitle',
  'availableQuantityContainer',
] as const

export type OnChangeCallback = {
  value: number
}


const { useOrderForm } = OrderForm

const VIRTUAL_MAX_VALUE = 36
const DEFAULT_GIFT_TABLE_ID = 'default-gift-table-id'

const BaseProductQuantity: StorefrontFunctionComponent<BaseProps> = ({
  dispatch,
  selectedItem,
  size = 'small',
  showLabel = true,
  selectedQuantity,
  warningQuantityThreshold = 0,
  selectorType = 'stepper',
  showUnit = true,
  quantitySelectorStep = 'unitMultiplier',
}) => {
  const handles = useCssHandles(CSS_HANDLES)
  const onChange = useCallback(
    (e: OnChangeCallback) => {
      dispatch({ type: 'SET_QUANTITY', args: { quantity: e.value } })
    },
    [dispatch]
  )

  const [availableQuantity, setAvailableQuantity] = useState(selectedItem?.sellers?.find(({ sellerDefault }) => sellerDefault === true)
  ?.commertialOffer?.AvailableQuantity ?? 0)
   
  const orderForm = useOrderForm()
  
  const mdr = orderForm?.orderForm?.customData?.customApps?.find((app: {id: string}) =>  app?.id === 'mdr')

  if (!selectedItem) {
    return null
  }

  useEffect(() => {
    const giftTableId = mdr?.fields?.giftTableId ?? DEFAULT_GIFT_TABLE_ID
    const refId = selectedItem?.referenceId[0].Value
    const skuId = selectedItem.itemId

    if(!refId || !skuId) return

    const getIsVirtual = async () => {
      const res = await fetch(`/chapur/v1/sku-virtual/${giftTableId}/${refId}/${skuId}`)
      const data = await res.json()
      const virtual = data.virtual ?? false
      const physicalInventory = data.physicalInventory ?? 0

      setAvailableQuantity(virtual ? VIRTUAL_MAX_VALUE : physicalInventory)
    }

    getIsVirtual()
  }, [mdr, selectedItem.itemId])
  
  const showAvailable = availableQuantity <= warningQuantityThreshold
  const unitMultiplier =
    quantitySelectorStep === 'singleUnit' ? 1 : selectedItem.unitMultiplier
  
  return (
    <div
      className={`${handles.quantitySelectorContainer} flex flex-column mb4`}>
      {showLabel && (
        <div
          className={`${handles.quantitySelectorTitle} mb3 c-muted-2 t-body`}>
          <FormattedMessage id="store/product-quantity.quantity" />
        </div>
      )}
      {selectorType === 'stepper' && (
        <StepperProductQuantity
          showUnit={showUnit}
          size={size}
          unitMultiplier={unitMultiplier}
          measurementUnit={selectedItem.measurementUnit}
          selectedQuantity={selectedQuantity}
          availableQuantity={availableQuantity}
          onChange={onChange}
        />
      )}
      {selectorType === 'dropdown' && availableQuantity > 0 && (
        <DropdownProductQuantity
          itemId={selectedItem.itemId}
          selectedQuantity={selectedQuantity}
          availableQuantity={availableQuantity}
          onChange={onChange}
          size={size}
        />
      )}
      {showAvailable && (
        <div
          className={`${handles.availableQuantityContainer} mv4 c-muted-2 t-small`}>
          <FormattedMessage
            id="store/product-quantity.quantity-available"
            values={{ availableQuantity }}
          />
        </div>
      )}
    </div>
  )
}

export default BaseProductQuantity
